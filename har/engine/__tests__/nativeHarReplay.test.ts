import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterAll, afterEach, beforeAll, describe, expect, it, jest } from '@jest/globals';
import type { BrowserContext } from '@playwright/test';

import type {
    Entry,
    HARFile,
    LocalUtilsHarLookupParams,
    LocalUtilsHarLookupResult,
} from '../../types';
import { writeZipEntries } from '../../vendor/zip';
import { resetDegradations } from '../diagnostics';
import { tryNativeHarReplay } from '../nativeHarReplay';
import { resetHarTransforms, setFixtureHarTransforms } from '../transformRegistry';

const HOST = 'https://example.test';
const PLACEHOLDER = 'https://base.url.placeholder';
const PLAYWRIGHT_HAR_ID = 'playwright-har';

type HarOpenResult = { harId?: string; error?: string };

type EntryOverrides = {
    url?: string;
    body?: string;
    bodyFile?: string;
};

function makeEntry({ url = `${HOST}/api`, body = 'ok', bodyFile }: EntryOverrides = {}): Entry {
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
            status: 200,
            statusText: '',
            httpVersion: 'HTTP/1.1',
            cookies: [],
            headers: [],
            content: bodyFile
                ? { _file: bodyFile, mimeType: 'text/plain' }
                : { text: body, mimeType: 'text/plain' },
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

function replaceHost(harFile: HARFile) {
    for (const entry of harFile.log.entries) {
        // eslint-disable-next-line no-param-reassign -- transforms mutate the dump in place
        entry.request.url = entry.request.url.replace(PLACEHOLDER, HOST);
    }
}

/**
 * Stands in for the client-side `LocalUtils`. The engine patches `localUtils` in
 * place, so Playwright's own methods are kept separately as `playwright` — every
 * call that reaches them was not answered by the engine.
 */
function makeLocalUtils() {
    const playwright = {
        harOpen: jest.fn(async (_params: { file: string }): Promise<HarOpenResult> => ({
            harId: PLAYWRIGHT_HAR_ID,
        })),
        harLookup: jest.fn(
            async (_params: LocalUtilsHarLookupParams): Promise<LocalUtilsHarLookupResult> => ({
                action: 'noentry',
            }),
        ),
        harClose: jest.fn(async (_params: { harId: string }): Promise<void> => undefined),
    };

    return { localUtils: { ...playwright }, playwright };
}

type LocalUtilsStub = ReturnType<typeof makeLocalUtils>['localUtils'];

/**
 * Stands in for Playwright's `HarRouter`: `routeFromHAR` opens the dump through
 * `localUtils.harOpen`, requests go through `harLookup`, disposal through
 * `harClose` — on the very same object the engine has patched.
 */
function makeRouter(localUtils: LocalUtilsStub) {
    let harId: string | undefined;

    const routeFromHAR = jest.fn(async (file: string) => {
        const result = await localUtils.harOpen({ file });

        if (result.error) {
            throw new Error(result.error);
        }

        harId = result.harId;
    });

    return {
        routeFromHAR,
        harId: () => harId,
        lookup: (url: string) =>
            localUtils.harLookup({
                harId: harId!,
                url,
                method: 'GET',
                headers: [],
                isNavigationRequest: false,
            }),
        close: () => localUtils.harClose({ harId: harId! }),
    };
}

function makeTarget(localUtils: LocalUtilsStub | undefined): BrowserContext {
    return {
        _connection: { localUtils: () => localUtils },
    } as unknown as BrowserContext;
}

describe('tryNativeHarReplay', () => {
    let directory: string;
    let counter = 0;

    beforeAll(async () => {
        directory = await mkdtemp(join(tmpdir(), 'playwright-tools-native-test-'));
    });

    afterAll(async () => {
        await rm(directory, { force: true, recursive: true });
    });

    afterEach(() => {
        resetHarTransforms({ global: true });
        resetDegradations();
    });

    async function writeDump(entries: Entry[], { zip = false } = {}) {
        counter += 1;

        if (!zip) {
            const file = join(directory, `dump-${counter}.har`);

            await writeFile(file, JSON.stringify(makeHar(entries)), 'utf8');

            return file;
        }

        const file = join(directory, `dump-${counter}.har.zip`);
        const members = new Map<string, Buffer>();

        members.set('har.har', Buffer.from(JSON.stringify(makeHar(entries)), 'utf8'));
        members.set('body.txt', Buffer.from('from blob', 'utf8'));

        await writeZipEntries(file, members);

        return file;
    }

    async function replay(localUtils: LocalUtilsStub, file: string) {
        const router = makeRouter(localUtils);
        const handled = await tryNativeHarReplay(
            makeTarget(localUtils),
            router.routeFromHAR,
            file,
            {},
        );

        return { handled, router };
    }

    it('hands the dump to Playwright when no open transform is registered', async () => {
        const { localUtils, playwright } = makeLocalUtils();
        const file = await writeDump([makeEntry()]);

        const { handled, router } = await replay(localUtils, file);

        expect(handled).toBe(true);
        expect(router.routeFromHAR).toHaveBeenCalledWith(file, {});
        expect(playwright.harOpen).toHaveBeenCalledWith({ file });
        expect(router.harId()).toBe(PLAYWRIGHT_HAR_ID);

        await expect(router.lookup(`${HOST}/api`)).resolves.toStrictEqual({ action: 'noentry' });
        expect(playwright.harLookup).toHaveBeenCalledTimes(1);

        await router.close();
        expect(playwright.harClose).toHaveBeenCalledWith({ harId: PLAYWRIGHT_HAR_ID });
    });

    it('answers lookups from the transformed dump when an open transform is registered', async () => {
        setFixtureHarTransforms({ open: replaceHost });

        const { localUtils, playwright } = makeLocalUtils();
        const file = await writeDump([makeEntry({ url: `${PLACEHOLDER}/api` })]);

        const { router } = await replay(localUtils, file);

        // Playwright's router was given the original path and never opened the file.
        expect(router.routeFromHAR).toHaveBeenCalledWith(file, {});
        expect(playwright.harOpen).not.toHaveBeenCalled();
        expect(router.harId()).not.toBe(PLAYWRIGHT_HAR_ID);

        const result = await router.lookup(`${HOST}/api`);

        expect(result.action).toBe('fulfill');
        expect(result.body?.toString()).toBe('ok');
        expect(playwright.harLookup).not.toHaveBeenCalled();

        await router.close();
        expect(playwright.harClose).not.toHaveBeenCalled();

        // Once closed, the id is unknown here and the lookup goes back to Playwright.
        await router.lookup(`${HOST}/api`);
        expect(playwright.harLookup).toHaveBeenCalledTimes(1);
    });

    it('serves blobs from a zipped dump without rewriting it', async () => {
        setFixtureHarTransforms({ open: replaceHost });

        const { localUtils } = makeLocalUtils();
        const file = await writeDump(
            [makeEntry({ url: `${PLACEHOLDER}/api`, bodyFile: 'body.txt' })],
            { zip: true },
        );

        const { router } = await replay(localUtils, file);
        const result = await router.lookup(`${HOST}/api`);

        expect(result.action).toBe('fulfill');
        expect(result.body?.toString()).toBe('from blob');
    });

    it('applies the lookup transforms around both backends', async () => {
        const lookupParams = jest.fn((params: LocalUtilsHarLookupParams) => ({
            ...params,
            url: params.url.replace('/alias', '/api'),
        }));
        const lookupResult = jest.fn(
            async (result: LocalUtilsHarLookupResult): Promise<LocalUtilsHarLookupResult> => ({
                ...result,
                body: Buffer.from('patched', 'utf8'),
            }),
        );

        setFixtureHarTransforms({ lookupParams, lookupResult });

        const playwrightSide = makeLocalUtils();
        const playwrightRouter = (
            await replay(playwrightSide.localUtils, await writeDump([makeEntry()]))
        ).router;

        expect((await playwrightRouter.lookup(`${HOST}/alias`)).body?.toString()).toBe('patched');
        expect(playwrightSide.playwright.harLookup.mock.calls[0]![0].url).toBe(`${HOST}/api`);

        setFixtureHarTransforms({ open: replaceHost, lookupParams, lookupResult });

        const ownSide = makeLocalUtils();
        const ownRouter = (
            await replay(
                ownSide.localUtils,
                await writeDump([makeEntry({ url: `${PLACEHOLDER}/api` })]),
            )
        ).router;
        const result = await ownRouter.lookup(`${HOST}/alias`);

        expect(result.action).toBe('fulfill');
        expect(result.body?.toString()).toBe('patched');
        expect(lookupParams).toHaveBeenCalledTimes(2);
        expect(lookupResult).toHaveBeenCalledTimes(2);
    });

    it('patches a LocalUtils object once', async () => {
        const lookupParams = jest.fn((params: LocalUtilsHarLookupParams) => params);

        setFixtureHarTransforms({ lookupParams });

        const { localUtils } = makeLocalUtils();
        const file = await writeDump([makeEntry()]);

        await replay(localUtils, file);

        const { router } = await replay(localUtils, file);

        await router.lookup(`${HOST}/api`);

        expect(lookupParams).toHaveBeenCalledTimes(1);
    });

    it('rejects routeFromHAR when the archive has no .har file', async () => {
        setFixtureHarTransforms({ open: replaceHost });

        const file = join(directory, `empty-${++counter}.har.zip`);

        await writeZipEntries(file, new Map([['body.txt', Buffer.from('x')]]));

        await expect(replay(makeLocalUtils().localUtils, file)).rejects.toThrow(
            'does not have a .har file',
        );
    });

    it('declines with a one-time warning when there is no LocalUtils', async () => {
        const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
        const routeFromHAR = jest.fn(async () => undefined);
        const file = await writeDump([makeEntry()]);

        const handled = await tryNativeHarReplay(makeTarget(undefined), routeFromHAR, file, {});

        expect(handled).toBe(false);
        expect(routeFromHAR).not.toHaveBeenCalled();
        expect(warn).toHaveBeenCalledTimes(1);
        expect(warn.mock.calls[0]![0]).toContain('no-lookup-seam');

        warn.mockRestore();
    });
});
