import { access, readdir } from 'node:fs/promises';
import { dirname } from 'node:path';

import type { BrowserContext } from '@playwright/test';
import { expect, test } from '@playwright/test';

import { initDumps, installHarEngine } from '../../har';
import { getLastReplayEngine } from '../../har/engine/installHarEngine';
import { getHarEngineTier } from '../../har/engine/legacyHarEngine';
import { setForcedFallbackReplay } from '../../har/engine/nativeHarReplay';

import type { OriginServer } from './origin-server';
import { startOriginServer } from './origin-server';
import { PATCHED_BODY, expectScrubbed, readDump, setBaseURL } from './transforms';

type TracingWithHar = BrowserContext['tracing'] & {
    startHar?: (path: string) => Promise<unknown>;
    stopHar?: () => Promise<void>;
};

async function exists(file: string): Promise<boolean> {
    try {
        await access(file);

        return true;
    } catch {
        return false;
    }
}

async function recordingDirectoriesNextTo(file: string): Promise<string[]> {
    return (await readdir(dirname(file))).filter((name) => name.startsWith('.har-recording-'));
}

// Every way Playwright can write a dump, each proven by the bytes on disk. A
// counter would also pass on a broken path; the file is what gets committed.
test.describe('dump producers', () => {
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

    test.afterEach(() => {
        setForcedFallbackReplay(false);
    });

    test('browser.newContext({recordHar})', async ({ browser }, testInfo) => {
        const path = testInfo.outputPath('record-har.har.zip');
        const context = await browser.newContext({ recordHar: { path } });
        const page = await context.newPage();

        await page.goto(`${origin.baseURL}/`);
        await expect(page.locator('#out')).toContainText('RECORDED');
        await context.close();

        expectScrubbed(await readDump(path), origin.baseURL);
    });

    test('browser.newContext({recordHar}) with an unpacked dump', async ({ browser }, testInfo) => {
        const path = testInfo.outputPath('record-har.har');
        const context = await browser.newContext({ recordHar: { path } });
        const page = await context.newPage();

        await page.goto(`${origin.baseURL}/`);
        await expect(page.locator('#out')).toContainText('RECORDED');
        await context.close();

        expectScrubbed(await readDump(path), origin.baseURL);
    });

    test('browserType.launchPersistentContext({recordHar})', async ({
        playwright,
        browserName,
    }, testInfo) => {
        const path = testInfo.outputPath('persistent.har.zip');
        const context = await playwright[browserName].launchPersistentContext(
            testInfo.outputPath('profile'),
            { headless: true, recordHar: { path } },
        );
        const [page] = context.pages();

        await page!.goto(`${origin.baseURL}/`);
        await expect(page!.locator('#out')).toContainText('RECORDED');
        await context.close();

        expectScrubbed(await readDump(path), origin.baseURL);
    });

    test('context.tracing.startHar() / stopHar()', async ({ browser }, testInfo) => {
        const context = await browser.newContext();
        const tracing = context.tracing as TracingWithHar;

        test.skip(
            typeof tracing.startHar !== 'function',
            'tracing.startHar() needs Playwright 1.60',
        );

        const path = testInfo.outputPath('traced.har.zip');
        const page = await context.newPage();

        await tracing.startHar!(path);
        await page.goto(`${origin.baseURL}/`);
        await expect(page.locator('#out')).toContainText('RECORDED');
        await tracing.stopHar!();

        expectScrubbed(await readDump(path), origin.baseURL);

        await context.close();
    });

    test('context.tracing.startHar() exported by context.close()', async ({
        browser,
    }, testInfo) => {
        const context = await browser.newContext();
        const tracing = context.tracing as TracingWithHar;

        test.skip(
            typeof tracing.startHar !== 'function',
            'tracing.startHar() needs Playwright 1.60',
        );

        const path = testInfo.outputPath('traced-unstopped.har');
        const page = await context.newPage();

        await tracing.startHar!(path);
        await page.goto(`${origin.baseURL}/`);
        await expect(page.locator('#out')).toContainText('RECORDED');
        await context.close();

        expectScrubbed(await readDump(path), origin.baseURL);
    });

    test('installHarEngine(context) then page.routeFromHAR({update: true})', async ({
        browser,
    }, testInfo) => {
        const path = testInfo.outputPath('context-install.har.zip');
        const context = await browser.newContext();

        installHarEngine(context);

        const page = await context.newPage();

        await page.routeFromHAR(path, { update: true, url: /.*/ });
        await page.goto(`${origin.baseURL}/`);
        await expect(page.locator('#out')).toContainText('RECORDED');
        await context.close();

        expectScrubbed(await readDump(path), origin.baseURL);
    });

    test('installHarEngine(page) then page.routeFromHAR({update: true})', async ({
        browser,
    }, testInfo) => {
        const path = testInfo.outputPath('page-install.har');
        const context = await browser.newContext();
        const page = await context.newPage();

        installHarEngine(page);

        await page.routeFromHAR(path, { update: true, url: /.*/ });
        await page.goto(`${origin.baseURL}/`);
        await expect(page.locator('#out')).toContainText('RECORDED');
        await context.close();

        expectScrubbed(await readDump(path), origin.baseURL);
    });

    test('the temporary recording never survives the context', async ({ browser }, testInfo) => {
        const path = testInfo.outputPath('clean.har.zip');
        const context = await browser.newContext({ recordHar: { path } });
        const page = await context.newPage();

        await page.goto(`${origin.baseURL}/`);
        await expect(page.locator('#out')).toContainText('RECORDED');
        await context.close();

        expect(await exists(path)).toBe(true);
        expect(await recordingDirectoriesNextTo(path)).toStrictEqual([]);
    });

    test('browser.close() before context.close() leaves nothing behind and does not throw', async ({
        playwright,
        browserName,
    }, testInfo) => {
        const warnings: string[] = [];
        const originalWarn = console.warn;

        console.warn = (...args: unknown[]) => {
            warnings.push(args.map(String).join(' '));
        };

        try {
            const path = testInfo.outputPath('abandoned.har.zip');
            const browser = await playwright[browserName].launch();
            const context = await browser.newContext({ recordHar: { path } });
            const page = await context.newPage();

            await page.goto(`${origin.baseURL}/`);
            await expect(page.locator('#out')).toContainText('RECORDED');

            await browser.close();
            await context.close();

            // Playwright never exported the recording: no dump, no recording directory.
            await expect.poll(() => recordingDirectoriesNextTo(path)).toStrictEqual([]);
            expect(await exists(path)).toBe(false);

            if (getHarEngineTier() === 'public-api') {
                expect(warnings.join('\n')).toContain('record-not-exported');
                expect(warnings.join('\n')).toContain(path);
            }
        } finally {
            console.warn = originalWarn;
        }
    });

    test('replays through the userland fallback engine', async ({ browser }, testInfo) => {
        test.skip(
            getHarEngineTier() !== 'public-api',
            'the fallback engine belongs to the public-API tier',
        );

        const dumpsFilePath = () => testInfo.outputPath('fallback.har.zip');
        const recordContext = await browser.newContext();
        const recordPage = await recordContext.newPage();

        await initDumps(recordPage, testInfo, { dumpsFilePath, update: true, url: /.*/ });
        await recordPage.goto(`${origin.baseURL}/`);
        await expect(recordPage.locator('#out')).toContainText('RECORDED');
        await recordContext.close();

        origin.setPayload('LIVE');
        setForcedFallbackReplay(true);

        const replayContext = await browser.newContext();
        const replayPage = await replayContext.newPage();

        await initDumps(replayPage, testInfo, { dumpsFilePath, update: false, url: /.*/ });
        await replayPage.goto(`${origin.baseURL}/`);
        await expect(replayPage.locator('#out')).toHaveText(PATCHED_BODY);
        await replayContext.close();

        expect(getLastReplayEngine()).toBe('fallback');
    });
});
