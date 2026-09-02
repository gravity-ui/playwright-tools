import { expect, test } from '@playwright/test';

import type { OriginServer } from './origin-server';
import { startOriginServer } from './origin-server';
import {
    PATCHED_BODY,
    callsSince,
    expectScrubbed,
    readDump,
    setBaseURL,
    snapshotCalls,
} from './transforms';

// Sorts first, so that this is the first file the worker runs: `initDumps` and
// `installHarEngine` have never been called here. Registering the transforms
// alone has to be enough, as it was before the engine existed.
test.describe('bare routeFromHAR', () => {
    let origin: OriginServer;

    test.beforeAll(async () => {
        origin = await startOriginServer();
        setBaseURL(origin.baseURL);
    });

    test.afterAll(async () => {
        await origin.close();
    });

    test.beforeEach(() => {
        origin.setPayload('RECORDED');
    });

    test('records through context.routeFromHAR without initDumps', async ({
        browser,
    }, testInfo) => {
        const path = testInfo.outputPath('bare.har.zip');
        const before = snapshotCalls();
        const context = await browser.newContext();
        const page = await context.newPage();

        await context.routeFromHAR(path, { update: true, url: /.*/ });
        await page.goto(`${origin.baseURL}/`);
        await expect(page.locator('#out')).toContainText('RECORDED');
        await context.close();

        expect(callsSince(before).recorder).toBeGreaterThan(0);
        expectScrubbed(await readDump(path), origin.baseURL);
    });

    test('replays through context.routeFromHAR with notFound: fallback without initDumps', async ({
        browser,
    }, testInfo) => {
        const path = testInfo.outputPath('bare-replay.har.zip');
        const recordContext = await browser.newContext();
        const recordPage = await recordContext.newPage();

        await recordContext.routeFromHAR(path, { update: true, url: /.*/ });
        await recordPage.goto(`${origin.baseURL}/`);
        await expect(recordPage.locator('#out')).toContainText('RECORDED');
        await recordContext.close();

        // Anything that still reaches the origin now answers with LIVE. Without the
        // open transform nothing in the dump matches, and `fallback` sends every
        // request there.
        origin.setPayload('LIVE');

        const before = snapshotCalls();
        const replayContext = await browser.newContext();
        const replayPage = await replayContext.newPage();

        await replayContext.routeFromHAR(path, { update: false, notFound: 'fallback', url: /.*/ });
        await replayPage.goto(`${origin.baseURL}/`);
        await expect(replayPage.locator('#out')).toHaveText(PATCHED_BODY);
        await replayContext.close();

        expect(callsSince(before).open).toBeGreaterThan(0);
    });
});
