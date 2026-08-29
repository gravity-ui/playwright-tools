import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterAll, beforeAll, describe, expect, it } from '@jest/globals';

import { readZipEntries, writeZipEntries } from '../zip';

const RECORDED_ARCHIVE = join(__dirname, 'fixtures', 'playwright-recorded.har.zip');

describe('zip', () => {
    let directory: string;

    beforeAll(async () => {
        directory = await mkdtemp(join(tmpdir(), 'playwright-tools-zip-test-'));
    });

    afterAll(async () => {
        await rm(directory, { force: true, recursive: true });
    });

    it('reads an archive recorded by Playwright itself', async () => {
        const entries = await readZipEntries(RECORDED_ARCHIVE);

        expect([...entries.keys()].sort()).toStrictEqual([
            '2a3537a01b1172c85625ad4982f24cd747b8b50f.html',
            '5e3a04087a84bf6d0d6b71f7fdc0a0eb78260c83.json',
            'febb1fbc2f3572e51547ebbfa0615d582b8887ec.html',
            'har.har',
        ]);

        // Playwright writes with the data descriptor flag set, which leaves the
        // sizes in the local file headers zeroed out. Reading them instead of the
        // central directory yields empty entries.
        const har = JSON.parse(entries.get('har.har')!.toString('utf8')) as {
            log: { entries: unknown[] };
        };

        expect(har.log.entries.length).toBeGreaterThan(0);
        expect(entries.get('5e3a04087a84bf6d0d6b71f7fdc0a0eb78260c83.json')!.toString('utf8')).toBe(
            '{"v":"REAL"}',
        );
    });

    it('round-trips entries it wrote itself', async () => {
        const file = join(directory, 'round-trip.zip');
        const entries = new Map([
            ['har.har', Buffer.from('{"log":{"entries":[]}}', 'utf8')],
            // Long and repetitive: worth deflating.
            ['big.txt', Buffer.from('a'.repeat(10_000), 'utf8')],
            // Short and random-ish: stored as is.
            ['tiny.bin', Buffer.from([0, 1, 2, 250, 251, 252])],
            ['имя-с-юникодом.txt', Buffer.from('значение', 'utf8')],
        ]);

        await writeZipEntries(file, entries);

        const read = await readZipEntries(file);

        expect([...read.keys()]).toStrictEqual([...entries.keys()]);

        for (const [name, content] of entries) {
            expect(read.get(name)).toStrictEqual(content);
        }
    });

    it('preserves an archive recorded by Playwright through a rewrite', async () => {
        const file = join(directory, 'rewritten.zip');
        const original = await readZipEntries(RECORDED_ARCHIVE);

        await writeZipEntries(file, original);

        const rewritten = await readZipEntries(file);

        expect([...rewritten.keys()]).toStrictEqual([...original.keys()]);

        for (const [name, content] of original) {
            expect(rewritten.get(name)).toStrictEqual(content);
        }
    });

    it('writes an empty archive that reads back as empty', async () => {
        const file = join(directory, 'empty.zip');

        await writeZipEntries(file, new Map());

        expect(await readZipEntries(file)).toStrictEqual(new Map());
    });

    it('rejects a file that is not an archive', async () => {
        const file = join(directory, 'not-a-zip.har');

        await writeFile(file, '{"log":{"entries":[]}}', 'utf8');
        await expect(readZipEntries(file)).rejects.toThrow('Not a ZIP archive');
    });
});
