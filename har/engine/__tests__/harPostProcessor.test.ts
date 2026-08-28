import { access, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterAll, afterEach, beforeAll, describe, expect, it } from '@jest/globals';

import type { Entry, HARFile } from '../../types';
import { readZipEntries, writeZipEntries } from '../../vendor/zip';
import { postProcessHarDump } from '../harPostProcessor';
import { resetHarTransforms, setFixtureHarTransforms } from '../transformRegistry';

function makeEntry(url: string, blob?: string): Entry {
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

    beforeAll(async () => {
        directory = await mkdtemp(join(tmpdir(), 'playwright-tools-post-test-'));
    });

    afterAll(async () => {
        await rm(directory, { force: true, recursive: true });
    });

    afterEach(() => {
        resetHarTransforms({ global: true });
    });

    async function writeArchive(entries: Entry[], blobs: Record<string, string> = {}) {
        const source = join(directory, `source-${++counter}.har.zip`);
        const members = new Map<string, Buffer>([
            ['har.har', Buffer.from(JSON.stringify(makeHar(entries)), 'utf8')],
        ]);

        for (const [name, body] of Object.entries(blobs)) {
            members.set(name, Buffer.from(body, 'utf8'));
        }

        await writeZipEntries(source, members);

        return { source, target: join(directory, `target-${counter}.har.zip`) };
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
        expect((await readArchivedHar(target)).har.log.entries).toHaveLength(1);
    });

    it('applies the per-entry transform before writing', async () => {
        const { source, target } = await writeArchive([
            makeEntry('https://example.test/a'),
            makeEntry('https://example.test/b'),
        ]);

        setFixtureHarTransforms({
            recorder: (entry) => {
                entry.request.headers = entry.request.headers.filter(
                    (header) => header.name.toLowerCase() !== 'cookie',
                );
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
                makeEntry('https://example.test/keep', 'keep-blob'),
                makeEntry('https://example.test/drop', 'drop-blob'),
            ],
            { 'keep-blob': 'kept', 'drop-blob': 'dropped' },
        );

        setFixtureHarTransforms({
            flush: (entries) => entries.filter((entry) => !entry.request.url.endsWith('/drop')),
        });

        await postProcessHarDump({ sourcePath: source, targetPath: target });

        const { members } = await readArchivedHar(target);

        expect([...members.keys()].sort()).toStrictEqual(['har.har', 'keep-blob']);
        expect(members.get('keep-blob')!.toString('utf8')).toBe('kept');
    });

    it('post-processes an uncompressed dump in place of the recording', async () => {
        const source = join(directory, 'plain-source.har');
        const target = join(directory, 'plain-target.har');

        await writeFile(
            source,
            JSON.stringify(makeHar([makeEntry('https://example.test/a')])),
            'utf8',
        );

        setFixtureHarTransforms({
            recorder: (entry) => {
                entry.request.url = 'https://base.url.placeholder/a';
            },
        });

        await postProcessHarDump({ sourcePath: source, targetPath: target });

        expect(await exists(source)).toBe(false);

        const har = JSON.parse(await readFile(target, 'utf8')) as HARFile;

        expect(har.log.entries[0]!.request.url).toBe('https://base.url.placeholder/a');
    });

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
