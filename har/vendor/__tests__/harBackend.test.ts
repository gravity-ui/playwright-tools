import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterAll, beforeAll, describe, expect, it } from '@jest/globals';

import type { Entry, HARFile, Header } from '../../types';
import { HarBackend } from '../harBackend';
import { writeZipEntries } from '../zip';

type EntryOverrides = {
    url?: string;
    method?: string;
    requestHeaders?: Header[];
    postData?: { text?: string; _file?: string; mimeType?: string };
    status?: number;
    responseHeaders?: Header[];
    content?: { text?: string; encoding?: string; _file?: string; mimeType?: string };
};

const HOST = 'https://example.test';

function makeEntry({
    url = `${HOST}/api`,
    method = 'GET',
    requestHeaders = [],
    postData,
    status = 200,
    responseHeaders = [],
    content = { text: 'ok', mimeType: 'text/plain' },
}: EntryOverrides = {}): Entry {
    return {
        startedDateTime: '2026-01-01T00:00:00.000Z',
        time: 1,
        request: {
            method,
            url,
            httpVersion: 'HTTP/1.1',
            cookies: [],
            headers: requestHeaders,
            queryString: [],
            postData,
            headersSize: -1,
            bodySize: -1,
        },
        response: {
            status,
            statusText: '',
            httpVersion: 'HTTP/1.1',
            cookies: [],
            headers: responseHeaders,
            content,
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
        log: {
            version: '1.2',
            creator: { name: 'test', version: '1' },
            entries,
        },
    };
}

describe('HarBackend', () => {
    let directory: string;
    let counter = 0;

    async function open(entries: Entry[], extraFiles: Record<string, string> = {}) {
        const file = join(directory, `dump-${++counter}.har`);

        for (const [name, body] of Object.entries(extraFiles)) {
            await writeFile(join(directory, name), body, 'utf8');
        }

        await writeFile(file, JSON.stringify(makeHar(entries)), 'utf8');

        return await HarBackend.open(file);
    }

    beforeAll(async () => {
        directory = await mkdtemp(join(tmpdir(), 'playwright-tools-har-test-'));
    });

    afterAll(async () => {
        await rm(directory, { force: true, recursive: true });
    });

    it('fulfills an exact url and method match', async () => {
        const backend = await open([
            makeEntry({
                status: 201,
                responseHeaders: [{ name: 'content-type', value: 'text/plain' }],
                content: { text: 'hello', mimeType: 'text/plain' },
            }),
        ]);

        const result = await backend.lookup(`${HOST}/api`, 'GET', [], undefined, false);

        expect(result.action).toBe('fulfill');
        expect(result.status).toBe(201);
        expect(result.headers).toStrictEqual([{ name: 'content-type', value: 'text/plain' }]);
        expect(result.body?.toString('utf8')).toBe('hello');
    });

    it('reports noentry for an unknown url or a different method', async () => {
        const backend = await open([makeEntry()]);

        expect(await backend.lookup(`${HOST}/other`, 'GET', [], undefined, false)).toStrictEqual({
            action: 'noentry',
        });
        expect(await backend.lookup(`${HOST}/api`, 'POST', [], undefined, false)).toStrictEqual({
            action: 'noentry',
        });
    });

    it('matches urls byte for byte, including the query string', async () => {
        const backend = await open([makeEntry({ url: `${HOST}/api?b=2&a=1` })]);

        expect(
            (await backend.lookup(`${HOST}/api?b=2&a=1`, 'GET', [], undefined, false)).action,
        ).toBe('fulfill');
        // Reordered query — a different request as far as the matcher is concerned.
        expect(
            (await backend.lookup(`${HOST}/api?a=1&b=2`, 'GET', [], undefined, false)).action,
        ).toBe('noentry');
    });

    it('decodes a base64 body', async () => {
        const backend = await open([
            makeEntry({
                content: {
                    text: Buffer.from('binary body', 'utf8').toString('base64'),
                    encoding: 'base64',
                    mimeType: 'application/octet-stream',
                },
            }),
        ]);

        const result = await backend.lookup(`${HOST}/api`, 'GET', [], undefined, false);

        expect(result.body?.toString('utf8')).toBe('binary body');
    });

    it('loads a body from a sidecar file', async () => {
        const backend = await open(
            [makeEntry({ content: { _file: 'body.txt', mimeType: 'text/plain' } })],
            { 'body.txt': 'from a file' },
        );

        const result = await backend.lookup(`${HOST}/api`, 'GET', [], undefined, false);

        expect(result.body?.toString('utf8')).toBe('from a file');
    });

    it('refuses a sidecar file that escapes the dump directory', async () => {
        const backend = await open([
            makeEntry({ content: { _file: '../escaped.txt', mimeType: 'text/plain' } }),
        ]);

        const result = await backend.lookup(`${HOST}/api`, 'GET', [], undefined, false);

        expect(result.action).toBe('error');
        expect(result.message).toContain('escapes base directory');
    });

    it('discriminates two identical urls by the POST body', async () => {
        const backend = await open([
            makeEntry({
                method: 'POST',
                postData: { text: '{"id":1}', mimeType: 'application/json' },
                content: { text: 'first', mimeType: 'text/plain' },
            }),
            makeEntry({
                method: 'POST',
                postData: { text: '{"id":2}', mimeType: 'application/json' },
                content: { text: 'second', mimeType: 'text/plain' },
            }),
        ]);

        const second = await backend.lookup(
            `${HOST}/api`,
            'POST',
            [],
            Buffer.from('{"id":2}', 'utf8'),
            false,
        );

        expect(second.body?.toString('utf8')).toBe('second');
    });

    it('ignores the multipart boundary when comparing POST bodies', async () => {
        const recordedBoundary = '----recorded';
        const liveBoundary = '----live';
        const body = (boundary: string) =>
            `--${boundary}\r\nContent-Disposition: form-data; name="a"\r\n\r\n1\r\n--${boundary}--`;

        const backend = await open([
            makeEntry({
                method: 'POST',
                requestHeaders: [
                    {
                        name: 'content-type',
                        value: `multipart/form-data; boundary=${recordedBoundary}`,
                    },
                ],
                postData: { text: body(recordedBoundary), mimeType: 'multipart/form-data' },
                content: { text: 'uploaded', mimeType: 'text/plain' },
            }),
        ]);

        const result = await backend.lookup(
            `${HOST}/api`,
            'POST',
            [{ name: 'content-type', value: `multipart/form-data; boundary=${liveBoundary}` }],
            Buffer.from(body(liveBoundary), 'utf8'),
            false,
        );

        expect(result.body?.toString('utf8')).toBe('uploaded');
    });

    it('breaks a tie by the number of matching headers', async () => {
        // This is what `markIdenticalRequests` / `setExtraHash` rely on: the extra
        // header only ever adds to the score, it never subtracts.
        const backend = await open([
            makeEntry({ content: { text: 'first', mimeType: 'text/plain' } }),
            makeEntry({
                requestHeaders: [{ name: 'x-tests-duplicate-id', value: '2' }],
                content: { text: 'second', mimeType: 'text/plain' },
            }),
        ]);

        const plain = await backend.lookup(`${HOST}/api`, 'GET', [], undefined, false);
        const stamped = await backend.lookup(
            `${HOST}/api`,
            'GET',
            [{ name: 'x-tests-duplicate-id', value: '2' }],
            undefined,
            false,
        );

        expect(plain.body?.toString('utf8')).toBe('first');
        expect(stamped.body?.toString('utf8')).toBe('second');
    });

    it('keeps document order when the header score ties', async () => {
        const backend = await open([
            makeEntry({ content: { text: 'first', mimeType: 'text/plain' } }),
            makeEntry({ content: { text: 'second', mimeType: 'text/plain' } }),
        ]);

        const result = await backend.lookup(`${HOST}/api`, 'GET', [], undefined, false);

        expect(result.body?.toString('utf8')).toBe('first');
    });

    it('follows a recorded redirect for a subresource', async () => {
        const backend = await open([
            makeEntry({
                url: `${HOST}/old`,
                status: 302,
                responseHeaders: [{ name: 'location', value: `${HOST}/new` }],
            }),
            makeEntry({ url: `${HOST}/new`, content: { text: 'moved', mimeType: 'text/plain' } }),
        ]);

        const result = await backend.lookup(`${HOST}/old`, 'GET', [], undefined, false);

        expect(result.action).toBe('fulfill');
        expect(result.body?.toString('utf8')).toBe('moved');
    });

    it('asks the router to redirect a navigation request', async () => {
        const backend = await open([
            makeEntry({
                url: `${HOST}/old`,
                status: 302,
                responseHeaders: [{ name: 'location', value: `${HOST}/new` }],
            }),
            makeEntry({ url: `${HOST}/new` }),
        ]);

        const result = await backend.lookup(`${HOST}/old`, 'GET', [], undefined, true);

        expect(result).toStrictEqual({ action: 'redirect', redirectURL: `${HOST}/new` });
    });

    it('downgrades a redirected POST to GET', async () => {
        const backend = await open([
            makeEntry({
                url: `${HOST}/submit`,
                method: 'POST',
                status: 302,
                responseHeaders: [{ name: 'location', value: `${HOST}/done` }],
            }),
            makeEntry({
                url: `${HOST}/done`,
                method: 'GET',
                content: { text: 'after redirect', mimeType: 'text/plain' },
            }),
        ]);

        const result = await backend.lookup(`${HOST}/submit`, 'POST', [], undefined, false);

        expect(result.body?.toString('utf8')).toBe('after redirect');
    });

    it('reports an error on a redirect cycle', async () => {
        const backend = await open([
            makeEntry({
                url: `${HOST}/a`,
                status: 302,
                responseHeaders: [{ name: 'location', value: `${HOST}/b` }],
            }),
            makeEntry({
                url: `${HOST}/b`,
                status: 302,
                responseHeaders: [{ name: 'location', value: `${HOST}/a` }],
            }),
        ]);

        const result = await backend.lookup(`${HOST}/a`, 'GET', [], undefined, false);

        expect(result.action).toBe('error');
        expect(result.message).toContain('redirect cycle');
    });

    it('serves a dump packed into an archive', async () => {
        const file = join(directory, 'archived.har.zip');

        await writeZipEntries(
            file,
            new Map([
                [
                    'har.har',
                    Buffer.from(
                        JSON.stringify(
                            makeHar([
                                makeEntry({
                                    content: { _file: 'body-blob', mimeType: 'text/plain' },
                                }),
                            ]),
                        ),
                        'utf8',
                    ),
                ],
                ['body-blob', Buffer.from('from the archive', 'utf8')],
            ]),
        );

        const backend = await HarBackend.open(file);
        const result = await backend.lookup(`${HOST}/api`, 'GET', [], undefined, false);

        expect(result.body?.toString('utf8')).toBe('from the archive');
    });

    it('exposes the parsed dump so that it can be transformed before matching', async () => {
        const backend = await open([makeEntry({ url: `${HOST}/placeholder` })]);

        expect((await backend.lookup(`${HOST}/real`, 'GET', [], undefined, false)).action).toBe(
            'noentry',
        );

        backend.harFile.log.entries[0]!.request.url = `${HOST}/real`;

        expect((await backend.lookup(`${HOST}/real`, 'GET', [], undefined, false)).action).toBe(
            'fulfill',
        );
    });
});
