import type { Browser, BrowserContext, BrowserType, Page, Tracing } from '@playwright/test';

import { getPlaywrightCoreEntries } from '../getPlaywrightCoreModule';

import { degrade } from './diagnostics';
import type { HarPostProcessTask } from './harPostProcessor';
import { postProcessHarDump } from './harPostProcessor';
import { installHarReplay } from './harReplayEngine';
import { getHarEngineTier, installLegacyHarEngine } from './legacyHarEngine';
import { tryNativeHarReplay } from './nativeHarReplay';

/** Identifies this copy of the package: a foreign token means another copy owns the wrapper. */
const INSTALL_TOKEN = {};

const BROWSER_TYPES = ['chromium', 'firefox', 'webkit'] as const;
const BROWSER_FACTORIES = ['launch', 'connect', 'connectOverCDP'] as const;

type Patchable = Record<string | symbol, unknown>;
type Method = (this: unknown, ...args: unknown[]) => unknown;
type CloseTask = () => Promise<void>;
type RouteFromHAROptions = NonNullable<Parameters<BrowserContext['routeFromHAR']>[1]>;
type RecordHarOptions = { recordHar?: { path: string } };

export type ReplayEngine = 'native' | 'fallback';

const pendingTasks = new WeakMap<BrowserContext, Map<string, CloseTask>>();
const closings = new WeakMap<BrowserContext, Promise<void>>();
const tracingOwners = new WeakMap<Tracing, BrowserContext>();
const pendingStartHar = new WeakMap<Tracing, HarPostProcessTask>();

let eagerlyInstalled = false;
let lastReplayEngine: ReplayEngine | undefined;

/**
 * Playwright writes the recording to this path, we post-process it into the
 * requested one. If anything goes wrong the dump is simply missing instead of
 * being committed with unscrubbed headers.
 */
export function recordingTempPath(targetPath: string): string {
    return targetPath.endsWith('.zip') ? `${targetPath}.recording.zip` : `${targetPath}.recording`;
}

/** Test seam: which engine served the most recent replay of this worker. */
export function getLastReplayEngine(): ReplayEngine | undefined {
    return lastReplayEngine;
}

function prototypeOf(value: unknown): Patchable {
    return Object.getPrototypeOf(value) as Patchable;
}

function wrappedMarker(method: string): symbol {
    return Symbol.for(`@gravity-ui/playwright-tools/har-wrapped/${method}`);
}

/**
 * Replaces `prototype[method]` with a wrapper, once per prototype. Returns
 * `false` when the method does not exist. A wrapper installed by another copy of
 * the package is left in place: the copies share the transform registry, so it
 * serves this copy's transforms too.
 */
function wrapMethod(
    prototype: Patchable,
    method: string,
    wrap: (original: Method) => Method,
): boolean {
    const marker = wrappedMarker(method);

    if (Object.prototype.hasOwnProperty.call(prototype, marker)) {
        if (prototype[marker] !== INSTALL_TOKEN) {
            degrade(
                'duplicate-package-copy',
                'Another copy of @gravity-ui/playwright-tools already installed the HAR engine ' +
                    'in this worker; its version of the engine is the one that runs. ' +
                    'Deduplicate the dependency.',
            );
        }

        return true;
    }

    const original = prototype[method];

    if (typeof original !== 'function') {
        return false;
    }

    // eslint-disable-next-line no-param-reassign -- intentional prototype monkey-patching
    prototype[method] = wrap(original as Method);
    // eslint-disable-next-line no-param-reassign -- intentional prototype monkey-patching
    prototype[marker] = INSTALL_TOKEN;

    return true;
}

function contextOf(target: Page | BrowserContext): BrowserContext {
    const page = target as Page;

    return typeof page.context === 'function' ? page.context() : (target as BrowserContext);
}

/**
 * Runs the post-processing scheduled for a context. Every task runs even when
 * an earlier one fails: each recording either becomes a dump or is removed, and
 * a failure of one must not leave another unscrubbed recording behind.
 */
async function runCloseTasks(context: BrowserContext): Promise<void> {
    const scheduled = pendingTasks.get(context);

    if (!scheduled) {
        return;
    }

    pendingTasks.delete(context);

    const errors: unknown[] = [];

    for (const task of scheduled.values()) {
        try {
            await task();
        } catch (error) {
            errors.push(error);
        }
    }

    if (errors.length === 1) {
        throw errors[0];
    }

    if (errors.length > 1) {
        throw new AggregateError(
            errors,
            `[@gravity-ui/playwright-tools] ${errors.length} HAR dumps failed to post-process: ` +
                errors.map((error) => (error as Error).message ?? String(error)).join('; '),
        );
    }
}

/**
 * Playwright's own `close` returns immediately while a first close is still
 * exporting the HAR, so a concurrent second call must not run the tasks again.
 */
function closeOnce(context: BrowserContext, originalClose: () => Promise<void>): Promise<void> {
    let closing = closings.get(context);

    if (!closing) {
        closing = (async () => {
            await originalClose();
            await runCloseTasks(context);
        })();
        closings.set(context, closing);
    }

    return closing;
}

function scheduleHarPostProcessing(context: BrowserContext, task: HarPostProcessTask): void {
    // Guarantees that `close` of this context runs the task.
    wrapContext(context);

    const tasks = pendingTasks.get(context) ?? new Map<string, CloseTask>();

    pendingTasks.set(context, tasks);

    if (tasks.has(task.targetPath)) {
        degrade(
            'duplicate-record-route',
            `${task.targetPath} is already being recorded by this context. ` +
                'routeFromHAR({update: true}) records the whole context, one call per ' +
                'context is enough; the later call is ignored.',
        );

        return;
    }

    tasks.set(task.targetPath, () => postProcessHarDump(task));
}

function takeScheduledTask(context: BrowserContext, targetPath: string): CloseTask | undefined {
    const tasks = pendingTasks.get(context);
    const task = tasks?.get(targetPath);

    tasks?.delete(targetPath);

    return task;
}

/** Points a `recordHar` option at the temporary recording path. */
function redirectRecordHar<T extends RecordHarOptions>(
    options: T | undefined,
): { options: T | undefined; task: HarPostProcessTask | undefined } {
    const targetPath = options?.recordHar?.path;

    if (!options?.recordHar || !targetPath) {
        return { options, task: undefined };
    }

    const task = { sourcePath: recordingTempPath(targetPath), targetPath };

    return {
        options: { ...options, recordHar: { ...options.recordHar, path: task.sourcePath } },
        task,
    };
}

function wrapRouteFromHAR(prototype: Patchable): void {
    const wrapped = wrapMethod(
        prototype,
        'routeFromHAR',
        (original) =>
            async function routeFromHAR(
                this: unknown,
                har: unknown,
                options: unknown = {},
            ): Promise<void> {
                const target = this as Page | BrowserContext;
                const file = har as string;
                const routeOptions = options as RouteFromHAROptions;

                if (routeOptions.update) {
                    const task = { sourcePath: recordingTempPath(file), targetPath: file };

                    await original.call(this, task.sourcePath, routeOptions);

                    scheduleHarPostProcessing(contextOf(target), task);

                    return;
                }

                // Preferred: Playwright's own router replays the dump, so response timing
                // stays exactly as it is without this package. Only the lookups are answered
                // here, and only when an open transform has to be applied.
                const native = await tryNativeHarReplay(
                    target,
                    original as (har: string, options: Record<string, unknown>) => Promise<void>,
                    file,
                    routeOptions as Record<string, unknown>,
                );

                lastReplayEngine = native ? 'native' : 'fallback';

                if (!native) {
                    await installHarReplay(target, file, {
                        notFound: routeOptions.notFound,
                        url: routeOptions.url,
                    });
                }
            },
    );

    if (!wrapped) {
        throw new Error(
            'Can\'t find "routeFromHAR" method in Playwright API. ' +
                'Playwright >= 1.23 is required for HAR dumps.',
        );
    }
}

function wrapPage(page: Page): void {
    wrapRouteFromHAR(prototypeOf(page));
}

/**
 * `tracing.startHar()` / `stopHar()` (Playwright 1.60+) are the third way a dump
 * gets written. The recording goes to the temporary path and is post-processed
 * by `stopHar()`, by the disposable `startHar()` returns (it calls `stopHar()`),
 * or by `context.close()`, which exports a recording that was never stopped.
 */
function wrapTracing(context: BrowserContext): void {
    const tracing = context.tracing as Tracing | undefined;

    if (!tracing) {
        return;
    }

    tracingOwners.set(tracing, context);

    const prototype = prototypeOf(tracing);

    wrapMethod(
        prototype,
        'startHar',
        (original) =>
            async function startHar(this: unknown, path: unknown, ...rest: unknown[]) {
                const tracingTarget = this as Tracing;
                const targetPath = path as string;
                const task = { sourcePath: recordingTempPath(targetPath), targetPath };
                const result = await original.call(this, task.sourcePath, ...rest);
                const owner = tracingOwners.get(tracingTarget);

                pendingStartHar.set(tracingTarget, task);

                if (owner) {
                    scheduleHarPostProcessing(owner, task);
                }

                return result;
            },
    );

    wrapMethod(
        prototype,
        'stopHar',
        (original) =>
            async function stopHar(this: unknown, ...args: unknown[]) {
                await original.apply(this, args);

                const tracingTarget = this as Tracing;
                const task = pendingStartHar.get(tracingTarget);

                if (!task) {
                    return;
                }

                pendingStartHar.delete(tracingTarget);

                const owner = tracingOwners.get(tracingTarget);
                const scheduled = owner ? takeScheduledTask(owner, task.targetPath) : undefined;

                await (scheduled ? scheduled() : postProcessHarDump(task));
            },
    );
}

function wrapContext(context: BrowserContext): void {
    const prototype = prototypeOf(context);

    wrapRouteFromHAR(prototype);

    wrapMethod(
        prototype,
        'newPage',
        (original) =>
            async function newPage(this: unknown, ...args: unknown[]) {
                const page = (await original.apply(this, args)) as Page;

                wrapPage(page);

                return page;
            },
    );

    wrapMethod(
        prototype,
        'close',
        (original) =>
            function close(this: unknown, ...args: unknown[]) {
                return closeOnce(
                    this as BrowserContext,
                    () => original.apply(this, args) as Promise<void>,
                );
            },
    );

    wrapTracing(context);

    for (const page of context.pages()) {
        wrapPage(page);
    }
}

function adoptContext(context: BrowserContext, task: HarPostProcessTask | undefined): void {
    wrapContext(context);

    if (task) {
        scheduleHarPostProcessing(context, task);
    }
}

function wrapBrowser(browser: Browser): void {
    wrapMethod(
        prototypeOf(browser),
        'newContext',
        (original) =>
            async function newContext(this: unknown, options?: unknown) {
                const redirected = redirectRecordHar(options as RecordHarOptions | undefined);
                const context = (await original.call(this, redirected.options)) as BrowserContext;

                adoptContext(context, redirected.task);

                return context;
            },
    );

    // `connectOverCDP` hands out contexts that already exist.
    for (const context of browser.contexts()) {
        wrapContext(context);
    }
}

/** Returns `false` when the prototype has none of the browser factories. */
function wrapBrowserType(prototype: Patchable): boolean {
    let found = false;

    for (const method of BROWSER_FACTORIES) {
        found =
            wrapMethod(
                prototype,
                method,
                (original) =>
                    async function createBrowser(this: unknown, ...args: unknown[]) {
                        const browser = (await original.apply(this, args)) as Browser;

                        wrapBrowser(browser);

                        return browser;
                    },
            ) || found;
    }

    found =
        wrapMethod(
            prototype,
            'launchPersistentContext',
            (original) =>
                async function launchPersistentContext(
                    this: unknown,
                    userDataDir: unknown,
                    options?: unknown,
                ) {
                    const redirected = redirectRecordHar(options as RecordHarOptions | undefined);
                    const context = (await original.call(
                        this,
                        userDataDir,
                        redirected.options,
                    )) as BrowserContext;

                    adoptContext(context, redirected.task);

                    return context;
                },
        ) || found;

    return found;
}

/**
 * Wraps the browser factories of every installed `playwright-core`, which is the
 * same object the test runner launches browsers with. Everything below them —
 * browsers, contexts, pages, tracing — is wrapped as it is created, so a
 * `routeFromHAR()`, `recordHar` or `startHar()` reached through any of them goes
 * through the engine, whether or not `installHarEngine()` saw the object first.
 */
function installEagerly(): void {
    if (eagerlyInstalled) {
        return;
    }

    let found = false;

    for (const entry of getPlaywrightCoreEntries()) {
        for (const name of BROWSER_TYPES) {
            const browserType = entry[name] as BrowserType | undefined;

            if (browserType && typeof browserType === 'object') {
                found = wrapBrowserType(prototypeOf(browserType)) || found;
            }
        }
    }

    if (!found) {
        throw new Error(
            'Can\'t find "BrowserType.launch" in playwright-core, the HAR engine can\'t be ' +
                'installed. Is playwright-core resolvable from @gravity-ui/playwright-tools?',
        );
    }

    eagerlyInstalled = true;
}

/**
 * Makes the registered transforms effective in this worker process.
 *
 * Playwright versions through 1.59 use the historical internal engine: its
 * patches are installed here. On 1.60 and newer every `routeFromHAR()`,
 * `recordHar` and `tracing.startHar()` of the worker is routed through the
 * public-API engine: transform-aware replay for reading, post-processing for
 * recording. The `add*Transform` functions and `initDumps` call it for you.
 *
 * Passing a page or a context additionally wraps that object's own prototypes,
 * which matters only when it comes from a `playwright-core` copy the package
 * could not resolve itself.
 */
export function installHarEngine(target?: Page | BrowserContext): void {
    if (getHarEngineTier() === 'legacy') {
        installLegacyHarEngine();

        return;
    }

    installEagerly();

    if (!target) {
        return;
    }

    const page = target as Page;

    if (typeof page.context === 'function') {
        wrapPage(page);
        wrapContext(page.context());

        return;
    }

    wrapContext(target as BrowserContext);
}
