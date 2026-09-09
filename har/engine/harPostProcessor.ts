import { access, mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises';
import { basename, dirname, join } from 'node:path';

import type { Entry, HARFile } from '../types';
import { harJsonStringify } from '../vendor/harJsonStringify';
import { readZipEntries, writeZipEntries } from '../vendor/zip';

import { degrade } from './diagnostics';
import { getHarTransforms } from './transformRegistry';

export type HarPostProcessTask = {
    /** Where Playwright actually wrote the recording, see `recordingTempPath` */
    sourcePath: string;
    /** Where the dump should end up */
    targetPath: string;
};

const RECORDING_DIR_PREFIX = '.har-recording-';

function applyTransforms(harFile: HARFile): boolean {
    const { recorder, flush } = getHarTransforms();

    if (!recorder && !flush) {
        return false;
    }

    if (recorder) {
        for (const entry of harFile.log.entries) {
            recorder(entry);
        }
    }

    if (flush) {
        // eslint-disable-next-line no-param-reassign -- the parsed dump is mutated in place
        harFile.log.entries = flush(harFile.log.entries);
    }

    return true;
}

function collectReferencedFiles(entries: Entry[]): Set<string> {
    const files = new Set<string>();

    for (const entry of entries) {
        const responseFile = entry.response.content._file;
        const requestFile = entry.request.postData?._file;

        if (responseFile) {
            files.add(responseFile);
        }

        if (requestFile) {
            files.add(requestFile);
        }
    }

    return files;
}

async function exists(file: string): Promise<boolean> {
    try {
        await access(file);

        return true;
    } catch {
        return false;
    }
}

async function moveIfExists(from: string, to: string): Promise<void> {
    try {
        await rename(from, to);
    } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
            throw error;
        }
    }
}

async function postProcessZip({ sourcePath, targetPath }: HarPostProcessTask) {
    const zipEntries = await readZipEntries(sourcePath);
    const harName = [...zipEntries.keys()].find((name) => name.endsWith('.har'));
    const harContent = harName === undefined ? undefined : zipEntries.get(harName);

    if (harName === undefined || harContent === undefined) {
        throw new Error('the recorded archive has no .har member');
    }

    const harFile = JSON.parse(harContent.toString('utf8')) as HARFile;

    if (!applyTransforms(harFile)) {
        await rename(sourcePath, targetPath);

        return;
    }

    const referencedFiles = collectReferencedFiles(harFile.log.entries);
    const nextEntries = new Map<string, Buffer>();

    nextEntries.set(harName, Buffer.from(harJsonStringify(harFile), 'utf8'));

    for (const [name, content] of zipEntries) {
        if (name !== harName && referencedFiles.has(name)) {
            nextEntries.set(name, content);
        }
    }

    await writeZipEntries(targetPath, nextEntries);
}

async function postProcessPlain({ sourcePath, targetPath }: HarPostProcessTask) {
    const harFile = JSON.parse(await readFile(sourcePath, 'utf8')) as HARFile;
    const transformed = applyTransforms(harFile);
    const sourceDir = dirname(sourcePath);
    const targetDir = dirname(targetPath);

    // Body blobs are sidecar files Playwright writes next to the recording. The
    // ones the dump still references move next to the dump; the rest go with
    // the recording directory. They are named by content, so an existing blob
    // of another dump is overwritten with the same bytes.
    if (sourceDir !== targetDir) {
        for (const name of collectReferencedFiles(harFile.log.entries)) {
            if (name === basename(name)) {
                await moveIfExists(join(sourceDir, name), join(targetDir, name));
            }
        }
    }

    if (!transformed) {
        await rename(sourcePath, targetPath);

        return;
    }

    await writeFile(targetPath, harJsonStringify(harFile), 'utf8');
}

/** The private recording directory, when the recording has one. */
function recordingDirectoryOf(sourcePath: string): string | undefined {
    const directory = dirname(sourcePath);

    return basename(directory).startsWith(RECORDING_DIR_PREFIX) ? directory : undefined;
}

/**
 * Applies the record-side transforms to a dump Playwright has already written,
 * then moves it to its final location. Whatever happens, the recording does not
 * survive: it still holds the headers the transforms were supposed to remove.
 */
export async function postProcessHarDump(task: HarPostProcessTask): Promise<void> {
    const recordingDirectory = recordingDirectoryOf(task.sourcePath);

    try {
        if (!(await exists(task.sourcePath))) {
            degrade(
                'record-not-exported',
                `No HAR was written for ${task.targetPath}: the browser or the context was ` +
                    'already gone when context.close() ran (browser.close() first, or a crash). ' +
                    'The dump was not updated.',
            );

            return;
        }

        await mkdir(dirname(task.targetPath), { recursive: true });

        if (task.sourcePath.endsWith('.zip')) {
            await postProcessZip(task);
        } else {
            await postProcessPlain(task);
        }
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);

        throw new Error(
            `[@gravity-ui/playwright-tools] Failed to post-process the HAR dump ${task.targetPath}: ${message}`,
            { cause: error },
        );
    } finally {
        await (recordingDirectory
            ? rm(recordingDirectory, { recursive: true, force: true })
            : rm(task.sourcePath, { force: true }));
    }
}
