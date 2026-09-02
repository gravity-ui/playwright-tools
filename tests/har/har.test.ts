import { expect, test } from '@playwright/test';

import { initDumps } from '../../har';
import { getLastReplayEngine } from '../../har/engine/installHarEngine';
import { getHarEngineTier } from '../../har/engine/legacyHarEngine';

import type { OriginServer } from './origin-server';
import { startOriginServer } from './origin-server';
import {
    PATCHED_BODY,
    callsSince,
    expectScrubbed,
    expectedTier,
    readDump,
    setBaseURL,
    snapshotCalls,
} from './transforms';

test.describe('har dumps', () => {
    let origin: OriginServer;

    test.beforeAll(async () => {
        origin = await startOriginServer();
        setBaseURL(origin.baseURL);
    });

    test.afterAll(async () => {
        await origin.close();
    });

    // Recording always happens against `RECORDED`; a test that wants to prove
    // nothing leaked to the live origin flips the payload itself before replaying.
    test.beforeEach(() => {
        origin.setPayload('RECORDED');
    });

    test('selects the engine tier at the 1.60 boundary', () => {
        expect(getHarEngineTier()).toBe(expectedTier);
    });

    test('records a dump, transforms it and replays it back', async ({ browser }, testInfo) => {
        const dumpsFilePath = () => testInfo.outputPath('dump.har.zip');

        // --- record ------------------------------------------------------
        const beforeRecord = snapshotCalls();
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

        const recordCalls = callsSince(beforeRecord);

        expect(recordCalls.recorder).toBeGreaterThan(0);
        // The post-processor flushes the finished dump exactly once; Playwright's
        // own recorder, patched on the legacy tier, flushes as it goes.
        expect(recordCalls.flush).toBe(getHarEngineTier() === 'legacy' ? recordCalls.flush : 1);
        expect(recordCalls.flush).toBeGreaterThan(0);

        expectScrubbed(await readDump(dumpsFilePath()), origin.baseURL);

        // --- replay ------------------------------------------------------
        // Anything that still reaches the origin now answers with LIVE.
        origin.setPayload('LIVE');

        const beforeReplay = snapshotCalls();
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
        expect(served).toBe(PATCHED_BODY);
        // ...and nothing leaked through to the live origin.
        expect(served).not.toContain('LIVE');

        const replayCalls = callsSince(beforeReplay);

        expect(replayCalls.open).toBe(1);
        expect(replayCalls.lookupParams).toBeGreaterThan(0);
        expect(replayCalls.lookupResult).toBeGreaterThan(0);

        // Playwright's own router served the replay; the userland engine is for
        // thin clients only.
        expect(getLastReplayEngine()).toBe(getHarEngineTier() === 'legacy' ? undefined : 'native');
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

        const har = await readDump(dumpsFilePath());

        expectScrubbed(har, origin.baseURL, { legacyRedirects: getHarEngineTier() === 'legacy' });
        expect(har.log.entries.map((entry) => entry.response.status)).toContain(302);

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
        await expect(replayPage.locator('#out')).toHaveText(PATCHED_BODY);

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
        expectScrubbed(await readDump(dumpsFilePath()), origin.baseURL);

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
        await expect(replayPage.locator('#out')).toHaveText(PATCHED_BODY);

        await replayContext.close();
    });
});
