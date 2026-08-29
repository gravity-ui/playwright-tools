import { readFile } from 'node:fs/promises';

import { expect, test } from '@playwright/test';

import type {
    Entry,
    HARFile,
    LocalUtilsHarLookupParams,
    LocalUtilsHarLookupResult,
} from '../../har';
import {
    addFlushTransform,
    addHarLookupTransform,
    addHarOpenTransform,
    addHarRecorderTransform,
    clearHeaders,
    initDumps,
    replaceBaseUrlInEntry,
} from '../../har';
import { readZipEntries } from '../../har/vendor/zip';

import type { OriginServer } from './origin-server';
import { startOriginServer } from './origin-server';

const PLACEHOLDER = 'https://base.url.placeholder';
const MARKER_HEADER = 'x-recorded-by-transform';

const calls = { recorder: 0, flush: 0, open: 0, lookupParams: 0, lookupResult: 0 };

let baseURL = '';

// Registered once per process, exactly the way a consumer does it from a
// module-level `playwrightPatches()` — the `add*Transform` latch only honours
// the first call anyway.
addHarRecorderTransform((entry: Entry) => {
    calls.recorder++;

    // eslint-disable-next-line no-param-reassign -- transforms mutate the entry in place
    entry.request.headers = clearHeaders(entry.request.headers, {
        removeHeaders: new Set(['cookie']),
    });
    // eslint-disable-next-line no-param-reassign -- transforms mutate the entry in place
    entry.response.headers = clearHeaders(entry.response.headers, {
        removeHeaders: new Set(['set-cookie']),
    });
    entry.response.headers.push({ name: MARKER_HEADER, value: '1' });

    replaceBaseUrlInEntry(entry, baseURL, PLACEHOLDER);
});

addFlushTransform((entries: Entry[]) => {
    calls.flush++;

    return entries.filter((entry) => entry.time !== -1);
});

addHarOpenTransform((harFile: HARFile) => {
    calls.open++;

    for (const entry of harFile.log.entries) {
        replaceBaseUrlInEntry(entry, PLACEHOLDER, baseURL);
    }
});

addHarLookupTransform(
    (params: LocalUtilsHarLookupParams) => {
        calls.lookupParams++;

        return params;
    },
    (result: LocalUtilsHarLookupResult, params: LocalUtilsHarLookupParams) => {
        calls.lookupResult++;

        if (result.action === 'fulfill' && params.url.endsWith('/api')) {
            return { ...result, body: Buffer.from(JSON.stringify({ payload: 'PATCHED' }), 'utf8') };
        }

        return result;
    },
);

test.describe('har dumps', () => {
    let origin: OriginServer;

    test.beforeAll(async () => {
        origin = await startOriginServer();
        baseURL = origin.baseURL;
    });

    test.afterAll(async () => {
        await origin.close();
    });

    // Recording always happens against `RECORDED`; a test that wants to prove
    // nothing leaked to the live origin flips the payload itself before replaying.
    test.beforeEach(() => {
        origin.setPayload('RECORDED');
    });

    test('records a dump, transforms it and replays it back', async ({ browser }, testInfo) => {
        const dumpsFilePath = () => testInfo.outputPath('dump.har.zip');

        // --- record ------------------------------------------------------
        const recordContext = await browser.newContext();
        const recordPage = await recordContext.newPage();

        const update = await initDumps(recordPage, testInfo, {
            dumpsFilePath,
            update: true,
            url: /.*/,
            zip: true,
        });

        expect(update).toBe(true);

        await recordPage.goto(`${origin.baseURL}/`);
        await expect(recordPage.locator('#out')).toContainText('RECORDED');
        await recordContext.close();

        expect(calls.recorder).toBeGreaterThan(0);
        expect(calls.flush).toBe(1);

        const members = await readZipEntries(dumpsFilePath());
        const harName = [...members.keys()].find((name) => name.endsWith('.har'));
        const har = JSON.parse(members.get(harName!)!.toString('utf8')) as HARFile;

        // The record-side transforms landed in the file that was actually written.
        expect(har.log.entries.length).toBeGreaterThan(0);
        expect(har.log.entries.every((entry) => entry.request.url.startsWith(PLACEHOLDER))).toBe(
            true,
        );
        expect(
            har.log.entries.flatMap((entry) =>
                entry.response.headers.filter(
                    (header) => header.name.toLowerCase() === 'set-cookie',
                ),
            ),
        ).toStrictEqual([]);
        expect(
            har.log.entries.every((entry) =>
                entry.response.headers.some((header) => header.name === MARKER_HEADER),
            ),
        ).toBe(true);

        // --- replay ------------------------------------------------------
        // Anything that still reaches the origin now answers with LIVE.
        origin.setPayload('LIVE');

        const replayContext = await browser.newContext();
        const replayPage = await replayContext.newPage();

        expect(
            await initDumps(replayPage, testInfo, {
                dumpsFilePath,
                update: false,
                url: /.*/,
                zip: true,
            }),
        ).toBe(false);

        await replayPage.goto(`${origin.baseURL}/`);
        await expect(replayPage.locator('#out')).not.toHaveText('initial');

        const served = await replayPage.textContent('#out');

        await replayContext.close();

        // The lookup-result transform rewrote the recorded body...
        expect(served).toBe(JSON.stringify({ payload: 'PATCHED' }));
        // ...and nothing leaked through to the live origin.
        expect(served).not.toContain('LIVE');

        expect(calls.open).toBeGreaterThan(0);
        expect(calls.lookupParams).toBeGreaterThan(0);
        expect(calls.lookupResult).toBeGreaterThan(0);
    });

    test('replays a recorded navigation redirect', async ({ browser }, testInfo) => {
        const dumpsFilePath = () => testInfo.outputPath('redirect.har.zip');

        const recordContext = await browser.newContext();
        const recordPage = await recordContext.newPage();

        await initDumps(recordPage, testInfo, {
            dumpsFilePath,
            update: true,
            url: /.*/,
            zip: true,
        });

        await recordPage.goto(`${origin.baseURL}/moved`);
        await expect(recordPage.locator('#out')).toContainText('RECORDED');
        await recordContext.close();

        const replayContext = await browser.newContext();
        const replayPage = await replayContext.newPage();

        await initDumps(replayPage, testInfo, {
            dumpsFilePath,
            update: false,
            url: /.*/,
            zip: true,
        });

        // Anything that still reaches the origin now answers with LIVE, so only the
        // replayed dump (rewritten by the lookup-result transform) can say PATCHED.
        origin.setPayload('LIVE');

        await replayPage.goto(`${origin.baseURL}/moved`);
        await expect(replayPage.locator('#out')).toHaveText(JSON.stringify({ payload: 'PATCHED' }));

        const url = replayPage.url();

        await replayContext.close();

        expect(url).toBe(`${origin.baseURL}/`);
    });

    test('records and replays an unpacked dump', async ({ browser }, testInfo) => {
        const dumpsFilePath = () => testInfo.outputPath('unpacked.har');

        const recordContext = await browser.newContext();
        const recordPage = await recordContext.newPage();

        await initDumps(recordPage, testInfo, {
            dumpsFilePath,
            update: true,
            url: /.*/,
            zip: false,
        });

        await recordPage.goto(`${origin.baseURL}/`);
        await expect(recordPage.locator('#out')).toContainText('RECORDED');
        await recordContext.close();

        // Playwright wrote a plain `.har` with the bodies as sidecar files next to it.
        const har = JSON.parse(await readFile(dumpsFilePath(), 'utf8')) as HARFile;

        expect(har.log.entries.length).toBeGreaterThan(0);
        expect(har.log.entries.every((entry) => entry.request.url.startsWith(PLACEHOLDER))).toBe(
            true,
        );

        origin.setPayload('LIVE');

        const replayContext = await browser.newContext();
        const replayPage = await replayContext.newPage();

        await initDumps(replayPage, testInfo, {
            dumpsFilePath,
            update: false,
            url: /.*/,
            zip: false,
        });

        await replayPage.goto(`${origin.baseURL}/`);
        await expect(replayPage.locator('#out')).toHaveText(JSON.stringify({ payload: 'PATCHED' }));

        await replayContext.close();
    });
});
