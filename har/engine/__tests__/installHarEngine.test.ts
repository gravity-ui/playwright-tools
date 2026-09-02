import { spawnSync } from 'node:child_process';
import { EventEmitter } from 'node:events';
import { access, mkdir, mkdtemp, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { basename, dirname, join } from 'node:path';

import {
    afterAll,
    afterEach,
    beforeAll,
    beforeEach,
    describe,
    expect,
    it,
    jest,
} from '@jest/globals';
import type { BrowserContext, Page } from '@playwright/test';
import escapeStringRegExp from 'escape-string-regexp';

import type { HarPostProcessTask } from '../harPostProcessor';
import type * as EngineModule from '../installHarEngine';
import { resetHarTransforms } from '../transformRegistry';

type Engine = typeof EngineModule;
type Tier = 'legacy' | 'public-api';

// Referenced from the hoisted `jest.mock` factories, hence the `mock` prefix.
const mockState = {
    tier: 'public-api' as Tier,
    entries: [] as unknown[],
    legacyInstalls: 0,
    postProcess: jest.fn(async (_task: HarPostProcessTask): Promise<void> => undefined),
    native: jest.fn(async (..._args: unknown[]): Promise<boolean> => true),
    fallback: jest.fn(async (..._args: unknown[]): Promise<void> => undefined),
};

jest.mock('../../getPlaywrightCoreModule', () => ({
    getPlaywrightCoreEntries: () => mockState.entries,
}));

jest.mock('../legacyHarEngine', () => ({
    getHarEngineTier: () => mockState.tier,
    installLegacyHarEngine: () => {
        mockState.legacyInstalls++;

        return true;
    },
}));

jest.mock('../harPostProcessor', () => ({
    postProcessHarDump: (task: HarPostProcessTask) => mockState.postProcess(task),
}));

jest.mock('../nativeHarReplay', () => ({
    tryNativeHarReplay: (...args: unknown[]) => mockState.native(...args),
}));

jest.mock('../harReplayEngine', () => ({
    installHarReplay: (...args: unknown[]) => mockState.fallback(...args),
}));

type RouteCall = { target: 'page' | 'context'; har: string; options: unknown };

/**
 * A fresh stand-in for the client-side class hierarchy of `playwright-core`.
 * Every method lives on a prototype, exactly where the engine wraps it, and
 * records what it was called with.
 */
function makePlaywright() {
    const seen = {
        routeFromHAR: [] as RouteCall[],
        newContext: [] as unknown[],
        launchPersistentContext: [] as unknown[],
        startHar: [] as string[],
        stopHar: 0,
    };

    class FakeTracing {
        async startHar(path: string, _options?: unknown) {
            seen.startHar.push(path);

            return { path };
        }

        async stopHar() {
            seen.stopHar++;
        }
    }

    class FakeContext extends EventEmitter {
        tracing = new FakeTracing();
        closes = 0;
        private readonly ownPages: FakePage[] = [];

        pages() {
            return this.ownPages;
        }

        async newPage() {
            const page = new FakePage(this);

            this.ownPages.push(page);

            return page;
        }

        async routeFromHAR(har: string, options?: unknown) {
            seen.routeFromHAR.push({ target: 'context', har, options });
        }

        async close() {
            this.closes++;

            await new Promise((resolve) => {
                setTimeout(resolve, 5);
            });

            this.emit('close', this);
        }
    }

    class FakePage {
        private readonly owner: FakeContext;

        constructor(owner: FakeContext) {
            this.owner = owner;
        }

        context() {
            return this.owner;
        }

        async routeFromHAR(har: string, options?: unknown) {
            seen.routeFromHAR.push({ target: 'page', har, options });
        }
    }

    class FakeBrowser {
        private readonly existing: FakeContext[];

        constructor(existing: FakeContext[] = []) {
            this.existing = existing;
        }

        contexts() {
            return this.existing;
        }

        async newContext(options?: unknown) {
            seen.newContext.push(options);

            return new FakeContext();
        }
    }

    class FakeBrowserType {
        async launch() {
            return new FakeBrowser();
        }

        async connect() {
            return new FakeBrowser();
        }

        async connectOverCDP() {
            return new FakeBrowser([new FakeContext()]);
        }

        async launchPersistentContext(_userDataDir: string, options?: unknown) {
            seen.launchPersistentContext.push(options);

            const context = new FakeContext();

            await context.newPage();

            return context;
        }
    }

    return {
        seen,
        FakeContext,
        FakeBrowserType,
        playwright: {
            chromium: new FakeBrowserType(),
            firefox: new FakeBrowserType(),
            webkit: new FakeBrowserType(),
        },
    };
}

type Fakes = ReturnType<typeof makePlaywright>;

/** A fresh engine module per test: the eager-install latch is module state. */
function loadEngine(): Engine {
    let engine: Engine | undefined;

    jest.isolateModules(() => {
        engine = require('../installHarEngine') as Engine;
    });

    return engine!;
}

function asContext(context: unknown): BrowserContext {
    return context as BrowserContext;
}

function asPage(page: unknown): Page {
    return page as Page;
}

/** Matches the private recording path of a dump: `<dir>/.har-recording-<pid>-<id>/<name>`. */
function recordingOf(target: string) {
    return expect.stringMatching(
        new RegExp(
            `^${escapeStringRegExp(dirname(target))}/\\.har-recording-${process.pid}-[0-9a-f]{8}/` +
                `${escapeStringRegExp(basename(target))}$`,
        ),
    ) as unknown as string;
}

async function exists(file: string) {
    try {
        await access(file);

        return true;
    } catch {
        return false;
    }
}

async function waitFor(condition: () => boolean) {
    for (let attempt = 0; attempt < 50 && !condition(); attempt++) {
        await new Promise((resolve) => {
            setTimeout(resolve, 5);
        });
    }

    expect(condition()).toBe(true);
}

describe('installHarEngine', () => {
    let dumps: string;
    let fakes: Fakes;
    let engine: Engine;
    let warn: ReturnType<typeof jest.spyOn>;

    beforeAll(async () => {
        dumps = await mkdtemp(join(tmpdir(), 'playwright-tools-engine-test-'));
    });

    afterAll(async () => {
        await rm(dumps, { force: true, recursive: true });
    });

    beforeEach(() => {
        fakes = makePlaywright();
        mockState.tier = 'public-api';
        mockState.entries = [fakes.playwright];
        mockState.legacyInstalls = 0;
        mockState.postProcess.mockReset();
        mockState.postProcess.mockImplementation(async () => undefined);
        mockState.native.mockReset();
        mockState.native.mockImplementation(async () => true);
        mockState.fallback.mockReset();
        mockState.fallback.mockImplementation(async () => undefined);
        warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
        engine = loadEngine();
    });

    function dump(name: string) {
        return join(dumps, name);
    }

    async function recordingDirectories() {
        return (await readdir(dumps)).filter((name) => name.startsWith('.har-recording-'));
    }

    afterEach(async () => {
        warn.mockRestore();
        delete process.env.PLAYWRIGHT_TOOLS_HAR_STRICT;
        resetHarTransforms({ global: true });

        // The post-processor is mocked, so the recording directories stay behind.
        for (const name of await recordingDirectories()) {
            await rm(join(dumps, name), { recursive: true, force: true });
        }
    });

    describe('on the legacy tier', () => {
        it('installs the historical patches and nothing else', () => {
            mockState.tier = 'legacy';
            mockState.entries = [];

            engine.installHarEngine();

            expect(mockState.legacyInstalls).toBe(1);
        });
    });

    describe('eager installation', () => {
        it('throws when no playwright-core can be resolved', () => {
            mockState.entries = [];

            expect(() => engine.installHarEngine()).toThrow(/BrowserType\.launch/);
        });

        it('throws when the resolved entry has no browser factories', () => {
            mockState.entries = [{ chromium: {} }];

            expect(() => engine.installHarEngine()).toThrow(/BrowserType\.launch/);
        });

        it('wraps the whole chain down from the browser factory', async () => {
            engine.installHarEngine();

            const browser = await fakes.playwright.chromium.launch();
            const context = await browser.newContext();
            const page = await context.newPage();

            await asPage(page).routeFromHAR(dump('page.har.zip'), { update: true, url: /.*/ });
            await asContext(context).routeFromHAR(dump('context.har'), { update: true });

            expect(fakes.seen.routeFromHAR).toStrictEqual([
                {
                    target: 'page',
                    har: recordingOf(dump('page.har.zip')),
                    options: { update: true, url: /.*/ },
                },
                {
                    target: 'context',
                    har: recordingOf(dump('context.har')),
                    options: { update: true },
                },
            ]);
            expect(mockState.postProcess).not.toHaveBeenCalled();

            await asContext(context).close();

            expect(mockState.postProcess.mock.calls.map(([task]) => task)).toStrictEqual([
                { sourcePath: fakes.seen.routeFromHAR[0]!.har, targetPath: dump('page.har.zip') },
                { sourcePath: fakes.seen.routeFromHAR[1]!.har, targetPath: dump('context.har') },
            ]);
        });

        it('wraps browsers obtained through connect and connectOverCDP, including existing contexts', async () => {
            engine.installHarEngine();

            const connected = await fakes.playwright.firefox.connect();
            const context = await connected.newContext();

            await asContext(context).routeFromHAR(dump('a.har'), { update: true });

            const cdp = await fakes.playwright.webkit.connectOverCDP();
            const [existing] = cdp.contexts();

            await asContext(existing).routeFromHAR(dump('b.har'), { update: true });

            expect(fakes.seen.routeFromHAR.map((call) => call.har)).toStrictEqual([
                recordingOf(dump('a.har')),
                recordingOf(dump('b.har')),
            ]);
        });

        it('wraps every installed copy of playwright-core', async () => {
            const second = makePlaywright();

            mockState.entries = [fakes.playwright, second.playwright];

            engine.installHarEngine();

            const context = await second.playwright.chromium.launchPersistentContext('/profile');

            await asContext(context).routeFromHAR(dump('a.har'), { update: true });

            expect(second.seen.routeFromHAR[0]!.har).toStrictEqual(recordingOf(dump('a.har')));
        });

        it('installs once per process', async () => {
            engine.installHarEngine();
            engine.installHarEngine(asContext(new fakes.FakeContext()));

            const browser = await fakes.playwright.chromium.launch();
            const context = await browser.newContext();

            await asContext(context).routeFromHAR(dump('a.har'), { update: true });

            // A second wrapper would have redirected the already redirected path.
            expect(fakes.seen.routeFromHAR[0]!.har).toStrictEqual(recordingOf(dump('a.har')));
        });
    });

    describe('installation from a live object', () => {
        it('reaches the pages of a context', async () => {
            const context = new fakes.FakeContext();
            const page = await context.newPage();

            engine.installHarEngine(asContext(context));

            await asPage(page).routeFromHAR(dump('a.har'), { update: true });

            expect(fakes.seen.routeFromHAR[0]!.har).toStrictEqual(recordingOf(dump('a.har')));
        });

        it('reaches the context of a page', async () => {
            const context = new fakes.FakeContext();
            const page = await context.newPage();

            engine.installHarEngine(asPage(page));

            await asContext(context).routeFromHAR(dump('a.har'), { update: true });

            expect(fakes.seen.routeFromHAR[0]!.har).toStrictEqual(recordingOf(dump('a.har')));
        });

        it('wraps pages created after the installation', async () => {
            const context = new fakes.FakeContext();

            engine.installHarEngine(asContext(context));

            const page = await context.newPage();

            await asPage(page).routeFromHAR(dump('a.har'), { update: true });

            expect(fakes.seen.routeFromHAR[0]!.har).toStrictEqual(recordingOf(dump('a.har')));
        });
    });

    describe('recordHar', () => {
        it('redirects browser.newContext({recordHar}) and post-processes on close', async () => {
            engine.installHarEngine();

            const browser = await fakes.playwright.chromium.launch();
            const context = await browser.newContext({
                baseURL: 'https://example.test',
                recordHar: { path: dump('record.har.zip'), mode: 'minimal' },
            });

            expect(fakes.seen.newContext).toStrictEqual([
                {
                    baseURL: 'https://example.test',
                    recordHar: { path: recordingOf(dump('record.har.zip')), mode: 'minimal' },
                },
            ]);

            const { path } = (fakes.seen.newContext[0] as { recordHar: { path: string } })
                .recordHar;

            // The recording directory is there before Playwright starts writing.
            expect(await exists(dirname(path))).toBe(true);

            await asContext(context).close();

            expect(mockState.postProcess.mock.calls.map(([task]) => task)).toStrictEqual([
                { sourcePath: path, targetPath: dump('record.har.zip') },
            ]);
        });

        it('leaves other options alone', async () => {
            engine.installHarEngine();

            const browser = await fakes.playwright.chromium.launch();

            await browser.newContext({ baseURL: 'https://example.test' });
            await browser.newContext();

            expect(fakes.seen.newContext).toStrictEqual([
                { baseURL: 'https://example.test' },
                undefined,
            ]);
        });

        it('redirects launchPersistentContext({recordHar}) and wraps its initial page', async () => {
            engine.installHarEngine();

            const context = await fakes.playwright.chromium.launchPersistentContext('/profile', {
                recordHar: { path: dump('persistent.har') },
            });

            expect(fakes.seen.launchPersistentContext).toStrictEqual([
                { recordHar: { path: recordingOf(dump('persistent.har')) } },
            ]);

            const [page] = context.pages();

            await asPage(page).routeFromHAR(dump('page.har'), { update: true });

            expect(fakes.seen.routeFromHAR[0]!.har).toStrictEqual(recordingOf(dump('page.har')));

            await asContext(context).close();

            expect(mockState.postProcess.mock.calls.map(([task]) => task.targetPath)).toStrictEqual(
                [dump('persistent.har'), dump('page.har')],
            );
        });
    });

    describe('tracing.startHar', () => {
        it('records to the temporary path and post-processes on stopHar', async () => {
            engine.installHarEngine();

            const browser = await fakes.playwright.chromium.launch();
            const context = await browser.newContext();
            const tracing = context.tracing;

            const handle = await tracing.startHar(dump('traced.har'), { content: 'embed' });

            expect(handle).toStrictEqual({ path: recordingOf(dump('traced.har')) });
            expect(fakes.seen.startHar).toStrictEqual([recordingOf(dump('traced.har'))]);

            await tracing.stopHar();

            expect(fakes.seen.stopHar).toBe(1);
            expect(mockState.postProcess.mock.calls.map(([task]) => task)).toStrictEqual([
                { sourcePath: fakes.seen.startHar[0], targetPath: dump('traced.har') },
            ]);

            await asContext(context).close();

            expect(mockState.postProcess).toHaveBeenCalledTimes(1);
        });

        it('post-processes a recording that was never stopped when the context closes', async () => {
            engine.installHarEngine();

            const browser = await fakes.playwright.chromium.launch();
            const context = await browser.newContext();

            await context.tracing.startHar(dump('traced.har'));
            await asContext(context).close();

            expect(mockState.postProcess.mock.calls.map(([task]) => task.targetPath)).toStrictEqual(
                [dump('traced.har')],
            );
        });
    });

    describe('replay', () => {
        it('goes through the native engine when the seam is reachable', async () => {
            engine.installHarEngine();

            const browser = await fakes.playwright.chromium.launch();
            const context = await browser.newContext();

            await asContext(context).routeFromHAR(dump('a.har'), { notFound: 'fallback' });

            expect(mockState.native).toHaveBeenCalledTimes(1);
            expect(mockState.native.mock.calls[0]![2]).toBe(dump('a.har'));
            expect(mockState.fallback).not.toHaveBeenCalled();
            expect(fakes.seen.routeFromHAR).toStrictEqual([]);
            expect(engine.getLastReplayEngine()).toBe('native');
        });

        it('falls back to the userland engine otherwise', async () => {
            mockState.native.mockImplementation(async () => false);

            engine.installHarEngine();

            const browser = await fakes.playwright.chromium.launch();
            const context = await browser.newContext();

            await asContext(context).routeFromHAR(dump('a.har'), {
                notFound: 'fallback',
                url: '**/api',
            });

            expect(mockState.fallback).toHaveBeenCalledTimes(1);
            expect(mockState.fallback.mock.calls[0]!.slice(1)).toStrictEqual([
                dump('a.har'),
                { notFound: 'fallback', url: '**/api' },
            ]);
            expect(engine.getLastReplayEngine()).toBe('fallback');
        });
    });

    describe('context close', () => {
        async function recordTwo(): Promise<BrowserContext> {
            engine.installHarEngine();

            const browser = await fakes.playwright.chromium.launch();
            const context = await browser.newContext();

            await asContext(context).routeFromHAR(dump('a.har'), { update: true });
            await asContext(context).routeFromHAR(dump('b.har'), { update: true });

            return asContext(context);
        }

        it('runs the tasks once for concurrent close calls', async () => {
            const context = await recordTwo();

            await Promise.all([context.close(), context.close()]);
            await context.close();

            expect((context as unknown as { closes: number }).closes).toBe(1);
            expect(mockState.postProcess).toHaveBeenCalledTimes(2);
        });

        it('runs every task even when an earlier one fails', async () => {
            const context = await recordTwo();

            mockState.postProcess.mockImplementation(async (task) => {
                if (task.targetPath === dump('a.har')) {
                    throw new Error('transform failed');
                }
            });

            await expect(context.close()).rejects.toThrow('transform failed');

            expect(mockState.postProcess.mock.calls.map(([task]) => task.targetPath)).toStrictEqual(
                [dump('a.har'), dump('b.har')],
            );
        });

        it('aggregates several failures', async () => {
            const context = await recordTwo();

            mockState.postProcess.mockImplementation(async (task) => {
                throw new Error(`failed ${task.targetPath}`);
            });

            await expect(context.close()).rejects.toMatchObject({
                name: 'AggregateError',
                message: expect.stringContaining(`failed ${dump('b.har')}`),
                errors: [expect.any(Error), expect.any(Error)],
            });
        });

        it('warns about a second recording into the same dump and keeps one task', async () => {
            engine.installHarEngine();

            const browser = await fakes.playwright.chromium.launch();
            const context = await browser.newContext();

            await asContext(context).routeFromHAR(dump('a.har'), { update: true });
            await asContext(context).routeFromHAR(dump('a.har'), { update: true });

            expect(warn).toHaveBeenCalledTimes(1);
            expect(warn.mock.calls[0]![0]).toContain('duplicate-record-route');

            await asContext(context).close();

            expect(mockState.postProcess).toHaveBeenCalledTimes(1);
        });

        it('runs the tasks when the context is closed from the browser side', async () => {
            const context = await recordTwo();

            (context as unknown as EventEmitter).emit('close', context);

            await waitFor(() => mockState.postProcess.mock.calls.length === 2);

            // A later close() finds nothing left to do.
            await context.close();

            expect(mockState.postProcess).toHaveBeenCalledTimes(2);
        });
    });

    describe('recording directories', () => {
        it('removes the recordings of processes that are gone and keeps the others', async () => {
            const dead = spawnSync(process.execPath, ['-e', '']).pid!;
            const stale = join(dumps, `.har-recording-${dead}-deadbeef`);
            const own = join(dumps, `.har-recording-${process.pid}-cafebabe`);
            const foreign = join(dumps, '.har-recording-not-a-pid');

            for (const directory of [stale, own, foreign]) {
                await mkdir(directory, { recursive: true });
                await writeFile(join(directory, 'dump.har'), '{}', 'utf8');
            }

            engine.installHarEngine();

            const browser = await fakes.playwright.chromium.launch();
            const context = await browser.newContext();

            await asContext(context).routeFromHAR(dump('a.har'), { update: true });

            expect(await exists(stale)).toBe(false);
            expect(await exists(own)).toBe(true);
            expect(await exists(foreign)).toBe(true);
            expect(warn).toHaveBeenCalledTimes(1);
            expect(warn.mock.calls[0]![0]).toContain('stale-recording-removed');
            expect(warn.mock.calls[0]![0]).toContain(stale);

            await rm(foreign, { recursive: true, force: true });
        });
    });

    describe('diagnostics', () => {
        it('reports a wrapper owned by another copy of the package', () => {
            const prototype = Object.getPrototypeOf(fakes.playwright.chromium) as Record<
                symbol,
                unknown
            >;

            prototype[Symbol.for('@gravity-ui/playwright-tools/har-wrapped/launch')] = {};

            engine.installHarEngine();

            expect(warn).toHaveBeenCalledTimes(1);
            expect(warn.mock.calls[0]![0]).toContain('duplicate-package-copy');
        });

        it('throws instead of warning in strict mode', () => {
            process.env.PLAYWRIGHT_TOOLS_HAR_STRICT = '1';

            const prototype = Object.getPrototypeOf(fakes.playwright.chromium) as Record<
                symbol,
                unknown
            >;

            prototype[Symbol.for('@gravity-ui/playwright-tools/har-wrapped/launch')] = {};

            expect(() => engine.installHarEngine()).toThrow(/duplicate-package-copy/);
            expect(warn).not.toHaveBeenCalled();
        });
    });
});
