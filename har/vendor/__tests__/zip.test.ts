import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
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

    /**
     * Turns a classic archive into a ZIP64 one the way an archiver does past
     * 65535 members: the classic record says "look elsewhere" and a ZIP64 record
     * plus its locator carry the real numbers.
     */
    async function convertToZip64(file: string) {
        const buffer = await readFile(file);
        const eocd = buffer.length - 22;
        const count = buffer.readUInt16LE(eocd + 10);
        const centralDirectorySize = buffer.readUInt32LE(eocd + 12);
        const centralDirectoryOffset = buffer.readUInt32LE(eocd + 16);
        const zip64Record = Buffer.alloc(56);
        const zip64Locator = Buffer.alloc(20);
        const classic = Buffer.from(buffer.subarray(eocd));

        zip64Record.writeUInt32LE(0x06064b50, 0);
        zip64Record.writeBigUInt64LE(BigInt(44), 4);
        zip64Record.writeBigUInt64LE(BigInt(count), 24);
        zip64Record.writeBigUInt64LE(BigInt(count), 32);
        zip64Record.writeBigUInt64LE(BigInt(centralDirectorySize), 40);
        zip64Record.writeBigUInt64LE(BigInt(centralDirectoryOffset), 48);

        zip64Locator.writeUInt32LE(0x07064b50, 0);
        zip64Locator.writeBigUInt64LE(BigInt(eocd), 8);
        zip64Locator.writeUInt32LE(1, 16);

        classic.writeUInt16LE(0xffff, 8);
        classic.writeUInt16LE(0xffff, 10);
        classic.writeUInt32LE(0xffffffff, 16);

        await writeFile(
            file,
            Buffer.concat([buffer.subarray(0, eocd), zip64Record, zip64Locator, classic]),
        );
    }

    it('reads every member of a ZIP64 archive', async () => {
        const file = join(directory, 'zip64.zip');

        await writeZipEntries(
            file,
            new Map([
                ['first.txt', Buffer.from('one', 'utf8')],
                ['second.txt', Buffer.from('two', 'utf8')],
            ]),
        );
        await convertToZip64(file);

        const entries = await readZipEntries(file);

        expect([...entries.keys()]).toStrictEqual(['first.txt', 'second.txt']);
        expect(entries.get('second.txt')!.toString('utf8')).toBe('two');
    });

    it('refuses a ZIP64 archive that has no locator instead of truncating it', async () => {
        const file = join(directory, 'zip64-no-locator.zip');

        await writeZipEntries(file, new Map([['first.txt', Buffer.from('one', 'utf8')]]));

        const buffer = await readFile(file);

        buffer.writeUInt16LE(0xffff, buffer.length - 22 + 10);
        await writeFile(file, buffer);

        await expect(readZipEntries(file)).rejects.toThrow(/ZIP64 archive without a ZIP64 locator/);
    });

    it('refuses a ZIP64 member by name', async () => {
        const file = join(directory, 'zip64-member.zip');

        await writeZipEntries(file, new Map([['huge.bin', Buffer.from('tiny', 'utf8')]]));

        const buffer = await readFile(file);
        const centralDirectory = buffer.readUInt32LE(buffer.length - 22 + 16);

        buffer.writeUInt32LE(0xffffffff, centralDirectory + 20);
        await writeFile(file, buffer);

        await expect(readZipEntries(file)).rejects.toThrow(
            /ZIP64 entries .* are not supported: huge\.bin/,
        );
    });

    it('refuses to write more members than a classic archive can hold', async () => {
        const entries = new Map<string, Buffer>();

        for (let index = 0; index <= 0xffff; index++) {
            entries.set(`member-${index}`, Buffer.alloc(0));
        }

        await expect(writeZipEntries(join(directory, 'too-many.zip'), entries)).rejects.toThrow(
            /Too many members .* 65536 in .*too-many\.zip, at most 65535/,
        );
    });
});
