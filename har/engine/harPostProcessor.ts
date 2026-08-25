import { mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';

import type { Entry, HARFile } from '../types';
import { harJsonStringify } from '../vendor/harJsonStringify';
import { readZipEntries, writeZipEntries } from '../vendor/zip';

import { getHarTransforms } from './transformRegistry';

export type HarPostProcessTask = {
    /** Where Playwright actually wrote the recording */
    sourcePath: string;
    /** Where the dump should end up */
    targetPath: string;
};

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

async function postProcessZip({ sourcePath, targetPath }: HarPostProcessTask) {
    const zipEntries = await readZipEntries(sourcePath);
    const harName = [...zipEntries.keys()].find((name) => name.endsWith('.har'));
    const harContent = harName === undefined ? undefined : zipEntries.get(harName);

    if (harName === undefined || harContent === undefined) {
        throw new Error(`Recorded archive does not have a .har file: ${sourcePath}`);
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
    await rm(sourcePath, { force: true });
}

async function postProcessPlain({ sourcePath, targetPath }: HarPostProcessTask) {
    const harFile = JSON.parse(await readFile(sourcePath, 'utf8')) as HARFile;

    if (!applyTransforms(harFile)) {
        await rename(sourcePath, targetPath);

        return;
    }

    // Body blobs are sidecar files written next to the recording; the temporary
    // recording lives in the target directory, so they are already in place.
    await writeFile(targetPath, harJsonStringify(harFile), 'utf8');
    await rm(sourcePath, { force: true });
}

/**
 * Applies the record-side transforms to a dump Playwright has already written,
 * then moves it to its final location.
 */
export async function postProcessHarDump(task: HarPostProcessTask): Promise<void> {
    await mkdir(dirname(task.targetPath), { recursive: true });

    if (task.sourcePath.endsWith('.zip')) {
        await postProcessZip(task);

        return;
    }

    await postProcessPlain(task);
}
