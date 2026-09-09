import { access, mkdir, mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';

import {
    afterAll,
    afterEach,
    beforeAll,
    beforeEach,
    describe,
    expect,
    it,
    jest,
} from '@jest/globals';

import type { Entry, HARFile } from '../../types';
import { readZipEntries, writeZipEntries } from '../../vendor/zip';
import { resetDegradations } from '../diagnostics';
import { postProcessHarDump } from '../harPostProcessor';
import { recordingTempPath } from '../installHarEngine';
import { resetHarTransforms, setFixtureHarTransforms } from '../transformRegistry';

function makeEntry(url: string, blob?: string, postBlob?: string): Entry {
    return {
        startedDateTime: '2026-01-01T00:00:00.000Z',
        time: 1,
        request: {
            method: 'GET',
            url,
            httpVersion: 'HTTP/1.1',
            cookies: [],
            headers: [{ name: 'cookie', value: 'secret=1' }],
            queryString: [],
            postData: postBlob ? { mimeType: 'application/json', _file: postBlob } : undefined,
            headersSize: -1,
            bodySize: -1,
        },
        response: {
            status: 200,
            statusText: '',
            httpVersion: 'HTTP/1.1',
            cookies: [],
            headers: [],
            content: blob
                ? { size: 1, mimeType: 'text/plain', _file: blob }
                : { size: 0, mimeType: '' },
            redirectURL: '',
            headersSize: -1,
            bodySize: -1,
        },
        cache: {},
        timings: { send: 0, wait: 0, receive: 0 },
    } as unknown as Entry;
}

function makeHar(entries: Entry[]): HARFile {
    return {
        log: { version: '1.2', creator: { name: 'test', version: '1' }, entries },
    };
}

async function exists(file: string) {
    try {
        await access(file);

        return true;
    } catch {
        return false;
    }
}

describe('postProcessHarDump', () => {
    let directory: string;
    let counter = 0;
    let warn: ReturnType<typeof jest.spyOn>;

    beforeAll(async () => {
        directory = await mkdtemp(join(tmpdir(), 'playwright-tools-post-test-'));
    });

    afterAll(async () => {
        await rm(directory, { force: true, recursive: true });
    });

    beforeEach(() => {
        warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    });

    afterEach(() => {
        warn.mockRestore();
        resetDegradations();
        resetHarTransforms({ global: true });
    });

    /** The private recording directory of a dump, the way the engine lays it out. */
    async function recordingFor(target: string) {
        const source = recordingTempPath(target);

        await mkdir(dirname(source), { recursive: true });

        return source;
    }

    async function recordingDirectories() {
        return (await readdir(directory)).filter((name) => name.startsWith('.har-recording-'));
    }

    async function writeArchive(entries: Entry[], blobs: Record<string, string> = {}) {
        const target = join(directory, `target-${++counter}.har.zip`);
        const source = await recordingFor(target);
        const members = new Map<string, Buffer>([
            ['har.har', Buffer.from(JSON.stringify(makeHar(entries)), 'utf8')],
        ]);

        for (const [name, body] of Object.entries(blobs)) {
            members.set(name, Buffer.from(body, 'utf8'));
        }

        await writeZipEntries(source, members);

        return { source, target };
    }

    async function writePlain(entries: Entry[], blobs: Record<string, string> = {}) {
        const target = join(directory, `target-${++counter}.har`);
        const source = await recordingFor(target);

        await writeFile(source, JSON.stringify(makeHar(entries)), 'utf8');

        for (const [name, body] of Object.entries(blobs)) {
            await writeFile(join(dirname(source), name), body, 'utf8');
        }

        return { source, target };
    }

    async function readArchivedHar(file: string) {
        const members = await readZipEntries(file);

        return {
            members,
            har: JSON.parse(members.get('har.har')!.toString('utf8')) as HARFile,
        };
    }

    it('moves the recording to the target path when nothing is registered', async () => {
        const { source, target } = await writeArchive([makeEntry('https://example.test/a')]);

        await postProcessHarDump({ sourcePath: source, targetPath: target });

        expect(await exists(source)).toBe(false);
        expect(await recordingDirectories()).toStrictEqual([]);
        expect((await readArchivedHar(target)).har.log.entries).toHaveLength(1);
    });

    it('applies the per-entry transform before writing', async () => {
        const { source, target } = await writeArchive([
            makeEntry('https://example.test/a'),
            makeEntry('https://example.test/b'),
        ]);

        setFixtureHarTransforms({
            recorder: (entry) => {
                // eslint-disable-next-line no-param-reassign -- transforms mutate the entry in place
                entry.request.headers = entry.request.headers.filter(
                    (header) => header.name.toLowerCase() !== 'cookie',
                );
                // eslint-disable-next-line no-param-reassign -- transforms mutate the entry in place
                entry.request.url = entry.request.url.replace(
                    'https://example.test',
                    'https://base.url.placeholder',
                );
            },
        });

        await postProcessHarDump({ sourcePath: source, targetPath: target });

        const { har } = await readArchivedHar(target);

        expect(har.log.entries.map((entry) => entry.request.url)).toStrictEqual([
            'https://base.url.placeholder/a',
            'https://base.url.placeholder/b',
        ]);
        expect(har.log.entries.flatMap((entry) => entry.request.headers)).toStrictEqual([]);
    });

    it('applies the flush transform after the per-entry one', async () => {
        const { source, target } = await writeArchive([
            makeEntry('https://example.test/keep'),
            makeEntry('https://example.test/drop'),
        ]);
        const seen: string[] = [];

        setFixtureHarTransforms({
            recorder: (entry) => {
                seen.push(entry.request.url);
            },
            flush: (entries) => {
                // The per-entry pass has already run over every entry by now.
                expect(seen).toHaveLength(2);

                return entries.filter((entry) => !entry.request.url.endsWith('/drop'));
            },
        });

        await postProcessHarDump({ sourcePath: source, targetPath: target });

        const { har } = await readArchivedHar(target);

        expect(har.log.entries.map((entry) => entry.request.url)).toStrictEqual([
            'https://example.test/keep',
        ]);
    });

    it('drops blobs orphaned by the flush transform', async () => {
        const { source, target } = await writeArchive(
            [
                makeEntry('https://example.test/keep', 'keep-blob', 'keep-post-blob'),
                makeEntry('https://example.test/drop', 'drop-blob', 'drop-post-blob'),
            ],
            {
                'keep-blob': 'kept',
                'drop-blob': 'dropped',
                'keep-post-blob': 'kept-post',
                'drop-post-blob': 'dropped-post',
            },
        );

        setFixtureHarTransforms({
            flush: (entries) => entries.filter((entry) => !entry.request.url.endsWith('/drop')),
        });

        await postProcessHarDump({ sourcePath: source, targetPath: target });

        const { members } = await readArchivedHar(target);

        expect([...members.keys()].sort()).toStrictEqual([
            'har.har',
            'keep-blob',
            'keep-post-blob',
        ]);
        expect(members.get('keep-blob')!.toString('utf8')).toBe('kept');
        expect(members.get('keep-post-blob')!.toString('utf8')).toBe('kept-post');
    });

    it('post-processes an uncompressed dump and moves the blobs it references', async () => {
        const { source, target } = await writePlain(
            [
                makeEntry('https://example.test/keep', 'keep-blob.json', 'keep-post-blob.json'),
                makeEntry('https://example.test/drop', 'drop-blob.json'),
            ],
            {
                'keep-blob.json': 'kept',
                'keep-post-blob.json': 'kept-post',
                'drop-blob.json': 'dropped',
            },
        );

        setFixtureHarTransforms({
            recorder: (entry) => {
                // eslint-disable-next-line no-param-reassign -- transforms mutate the entry in place
                entry.request.url = entry.request.url.replace(
                    'https://example.test',
                    'https://base.url.placeholder',
                );
            },
            flush: (entries) => entries.filter((entry) => !entry.request.url.endsWith('/drop')),
        });

        await postProcessHarDump({ sourcePath: source, targetPath: target });

        expect(await exists(source)).toBe(false);
        expect(await recordingDirectories()).toStrictEqual([]);

        const har = JSON.parse(await readFile(target, 'utf8')) as HARFile;

        expect(har.log.entries.map((entry) => entry.request.url)).toStrictEqual([
            'https://base.url.placeholder/keep',
        ]);
        expect(await readFile(join(directory, 'keep-blob.json'), 'utf8')).toBe('kept');
        expect(await readFile(join(directory, 'keep-post-blob.json'), 'utf8')).toBe('kept-post');
        expect(await exists(join(directory, 'drop-blob.json'))).toBe(false);
    });

    it('moves the blobs of an uncompressed dump even when nothing is registered', async () => {
        const { source, target } = await writePlain(
            [makeEntry('https://example.test/a', 'plain-blob.json')],
            { 'plain-blob.json': 'body' },
        );

        await postProcessHarDump({ sourcePath: source, targetPath: target });

        expect(await exists(target)).toBe(true);
        expect(await readFile(join(directory, 'plain-blob.json'), 'utf8')).toBe('body');
        expect(await recordingDirectories()).toStrictEqual([]);
    });

    it('supports a recording that has no private directory', async () => {
        const source = join(directory, 'plain-source.har');
        const target = join(directory, 'plain-target.har');

        await writeFile(
            source,
            JSON.stringify(makeHar([makeEntry('https://example.test/a')])),
            'utf8',
        );

        await postProcessHarDump({ sourcePath: source, targetPath: target });

        expect(await exists(source)).toBe(false);
        expect(await exists(target)).toBe(true);
    });

    it('reports a recording Playwright never exported and cleans up', async () => {
        const target = join(directory, 'never-exported.har.zip');
        const source = await recordingFor(target);

        await postProcessHarDump({ sourcePath: source, targetPath: target });

        expect(await exists(target)).toBe(false);
        expect(await recordingDirectories()).toStrictEqual([]);
        expect(warn).toHaveBeenCalledTimes(1);
        expect(warn.mock.calls[0]![0]).toContain('record-not-exported');
        expect(warn.mock.calls[0]![0]).toContain(target);
    });

    it.each(['zip', 'plain'] as const)(
        'removes the %s recording, its blobs and the dump when a transform fails',
        async (kind) => {
            const entries = [makeEntry('https://example.test/a', 'failing-blob.json')];
            const blobs = { 'failing-blob.json': 'unscrubbed' };
            const { source, target } =
                kind === 'zip'
                    ? await writeArchive(entries, blobs)
                    : await writePlain(entries, blobs);

            setFixtureHarTransforms({
                recorder: () => {
                    throw new Error('transform failed');
                },
            });

            await expect(
                postProcessHarDump({ sourcePath: source, targetPath: target }),
            ).rejects.toThrow(
                `[@gravity-ui/playwright-tools] Failed to post-process the HAR dump ${target}: transform failed`,
            );

            expect(await exists(source)).toBe(false);
            expect(await exists(target)).toBe(false);
            expect(await exists(join(directory, 'failing-blob.json'))).toBe(false);
            expect(await recordingDirectories()).toStrictEqual([]);
        },
    );

    it('writes the dump the way Playwright formats it', async () => {
        const { source, target } = await writeArchive([makeEntry('https://example.test/a')]);

        setFixtureHarTransforms({ recorder: () => undefined });

        await postProcessHarDump({ sourcePath: source, targetPath: target });

        const members = await readZipEntries(target);
        const text = members.get('har.har')!.toString('utf8');

        // Headers are collapsed onto a single line, the rest is indented.
        expect(text).toContain('{ "name": "cookie", "value": "secret=1" }');
        expect(text).toContain('\n  "log": {');
    });
});
