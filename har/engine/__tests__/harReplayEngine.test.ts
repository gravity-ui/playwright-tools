import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterAll, afterEach, beforeAll, describe, expect, it } from '@jest/globals';
import type { BrowserContext, Route } from '@playwright/test';

import type { Entry, HARFile, Header } from '../../types';
import { installHarReplay } from '../harReplayEngine';
import { resetHarTransforms, setFixtureHarTransforms } from '../transformRegistry';

const HOST = 'https://example.test';

type EntryOverrides = {
    url?: string;
    status?: number;
    responseHeaders?: Header[];
    body?: string;
};

type RouteCalls = {
    fulfill: Parameters<Route['fulfill']>[0][];
    abort: number;
    fallback: number;
};

function makeEntry({
    url = `${HOST}/api`,
    status = 200,
    responseHeaders = [],
    body = 'ok',
}: EntryOverrides = {}): Entry {
    return {
        startedDateTime: '2026-01-01T00:00:00.000Z',
        time: 1,
        request: {
            method: 'GET',
            url,
            httpVersion: 'HTTP/1.1',
            cookies: [],
            headers: [],
            queryString: [],
            headersSize: -1,
            bodySize: -1,
        },
        response: {
            status,
            statusText: '',
            httpVersion: 'HTTP/1.1',
            cookies: [],
            headers: responseHeaders,
            content: { text: body, mimeType: 'text/plain' },
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

/** A `Route` stub that records what the engine did with it. */
function makeRoute(url: string): { route: Route; calls: RouteCalls } {
    const calls: RouteCalls = { fulfill: [], abort: 0, fallback: 0 };
    const route = {
        request: () => ({
            url: () => url,
            method: () => 'GET',
            headersArray: async () => [],
            postDataBuffer: () => null,
            isNavigationRequest: () => false,
        }),
        fulfill: async (options: Parameters<Route['fulfill']>[0]) => {
            calls.fulfill.push(options);
        },
        abort: async () => {
            calls.abort += 1;
        },
        fallback: async () => {
            calls.fallback += 1;
        },
    } as unknown as Route;

    return { route, calls };
}

describe('installHarReplay', () => {
    let directory: string;
    let counter = 0;

    beforeAll(async () => {
        directory = await mkdtemp(join(tmpdir(), 'playwright-tools-replay-test-'));
    });

    afterAll(async () => {
        await rm(directory, { force: true, recursive: true });
    });

    afterEach(() => {
        resetHarTransforms({ global: true });
    });

    /**
     * `installHarReplay` only ever hands a handler to `route`, so a stub target
     * captures it and a stub `Route` drives one request through the engine.
     */
    async function replay(
        entries: Entry[],
        requestUrl: string,
        options: Parameters<typeof installHarReplay>[2] = {},
    ) {
        const file = join(directory, `dump-${++counter}.har`);

        await writeFile(file, JSON.stringify(makeHar(entries)), 'utf8');

        let handler: ((route: Route) => Promise<void>) | undefined;
        const target = {
            route: async (_url: string | RegExp, fn: (route: Route) => Promise<void>) => {
                handler = fn;
            },
        } as unknown as BrowserContext;

        await installHarReplay(target, file, options);

        const { route, calls } = makeRoute(requestUrl);

        await handler!(route);

        return calls;
    }

    it('fulfills a matched request with the recorded status, headers and body', async () => {
        const calls = await replay(
            [
                makeEntry({
                    status: 201,
                    responseHeaders: [{ name: 'content-type', value: 'text/plain' }],
                }),
            ],
            `${HOST}/api`,
        );

        expect(calls.fulfill).toHaveLength(1);
        expect(calls.fulfill[0]?.status).toBe(201);
        expect(calls.fulfill[0]?.headers).toStrictEqual({ 'content-type': 'text/plain' });
        expect(calls.fulfill[0]?.body?.toString()).toBe('ok');
    });

    it('folds repeated set-cookie headers into a single newline-joined value', async () => {
        const calls = await replay(
            [
                makeEntry({
                    responseHeaders: [
                        { name: 'set-cookie', value: 'a=1' },
                        { name: 'content-type', value: 'text/plain' },
                        { name: 'Set-Cookie', value: 'b=2' },
                    ],
                }),
            ],
            `${HOST}/api`,
        );

        expect(calls.fulfill[0]?.headers).toStrictEqual({
            'set-cookie': 'a=1\nb=2',
            'content-type': 'text/plain',
        });
    });

    it('leaves a request that never completed hanging', async () => {
        const calls = await replay([makeEntry({ status: -1 })], `${HOST}/api`);

        expect(calls).toStrictEqual({ fulfill: [], abort: 0, fallback: 0 });
    });

    it('aborts an unmatched request by default', async () => {
        const calls = await replay([makeEntry()], `${HOST}/missing`);

        expect(calls.abort).toBe(1);
        expect(calls.fallback).toBe(0);
    });

    it('falls through an unmatched request when asked to', async () => {
        const calls = await replay([makeEntry()], `${HOST}/missing`, { notFound: 'fallback' });

        expect(calls.fallback).toBe(1);
        expect(calls.abort).toBe(0);
    });

    it('applies the open transform to the dump before matching', async () => {
        setFixtureHarTransforms({
            open: (harFile) => {
                for (const entry of harFile.log.entries) {
                    // eslint-disable-next-line no-param-reassign -- transforms mutate the dump in place
                    entry.request.url = entry.request.url.replace(
                        'https://base.url.placeholder',
                        HOST,
                    );
                }
            },
        });

        const calls = await replay(
            [makeEntry({ url: 'https://base.url.placeholder/api' })],
            `${HOST}/api`,
        );

        expect(calls.fulfill[0]?.body?.toString()).toBe('ok');
    });

    it('routes every request when no url pattern is given', async () => {
        const patterns: (string | RegExp)[] = [];
        const target = {
            route: async (url: string | RegExp) => {
                patterns.push(url);
            },
        } as unknown as BrowserContext;
        const file = join(directory, `dump-${++counter}.har`);

        await writeFile(file, JSON.stringify(makeHar([makeEntry()])), 'utf8');

        await installHarReplay(target, file);
        await installHarReplay(target, file, { url: /api/ });

        expect(patterns).toStrictEqual(['**/*', /api/]);
    });
});
