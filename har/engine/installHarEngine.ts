import type { BrowserContext, Page } from '@playwright/test';

import type { HarPostProcessTask } from './harPostProcessor';
import { postProcessHarDump } from './harPostProcessor';
import { installHarReplay } from './harReplayEngine';

const ENGINE_INSTALLED = Symbol.for('@gravity-ui/playwright-tools/har-engine-installed');
const CLOSE_HOOKED = Symbol.for('@gravity-ui/playwright-tools/har-close-hooked');

type RouteFromHAR = BrowserContext['routeFromHAR'];
type RouteFromHAROptions = NonNullable<Parameters<RouteFromHAR>[1]>;

type Patchable = Record<string | symbol, unknown>;

const pendingTasks = new WeakMap<BrowserContext, HarPostProcessTask[]>();

/**
 * Playwright writes the recording to this path, we post-process it into the
 * requested one. If anything goes wrong the dump is simply missing instead of
 * being committed with unscrubbed headers.
 */
export function recordingTempPath(targetPath: string): string {
    return targetPath.endsWith('.zip') ? `${targetPath}.recording.zip` : `${targetPath}.recording`;
}

function contextOf(target: Page | BrowserContext): BrowserContext {
    const page = target as Page;

    return typeof page.context === 'function' ? page.context() : (target as BrowserContext);
}

function scheduleHarPostProcessing(context: BrowserContext, task: HarPostProcessTask) {
    const tasks = pendingTasks.get(context) ?? [];

    tasks.push(task);
    pendingTasks.set(context, tasks);

    const patchable = context as unknown as Patchable;

    if (patchable[CLOSE_HOOKED]) {
        return;
    }

    patchable[CLOSE_HOOKED] = true;

    const originalClose = context.close.bind(context);

    context.close = async (options?: Parameters<BrowserContext['close']>[0]) => {
        await originalClose(options);

        const scheduled = pendingTasks.get(context);

        if (!scheduled) {
            return;
        }

        pendingTasks.delete(context);

        for (const scheduledTask of scheduled) {
            await postProcessHarDump(scheduledTask);
        }
    };
}

function wrapRouteFromHAR(prototype: Patchable) {
    if (prototype[ENGINE_INSTALLED]) {
        return;
    }

    const original = prototype.routeFromHAR as RouteFromHAR | undefined;

    if (typeof original !== 'function') {
        throw new Error(
            '[@gravity-ui/playwright-tools] Cannot find the public "routeFromHAR" method. ' +
                'Playwright >= 1.23 is required for HAR dumps.',
        );
    }

    prototype.routeFromHAR = async function routeFromHAR(
        this: Page | BrowserContext,
        har: string,
        options: RouteFromHAROptions = {},
    ) {
        if (options.update) {
            const sourcePath = recordingTempPath(har);

            await original.call(this as BrowserContext, sourcePath, options);

            scheduleHarPostProcessing(contextOf(this), { sourcePath, targetPath: har });

            return;
        }

        await installHarReplay(this, har, { notFound: options.notFound, url: options.url });
    } as unknown as RouteFromHAR;

    // Latched only after the patch has actually been applied.
    prototype[ENGINE_INSTALLED] = true;
}

/**
 * Routes every `routeFromHAR` call of this worker through the engine of this
 * package: userland replay for reading, post-processing for recording.
 *
 * Only public Playwright API is wrapped, so it survives any internal refactoring.
 */
export function installHarEngine(target: Page | BrowserContext): void {
    const page = target as Page;

    if (typeof page.context === 'function') {
        wrapRouteFromHAR(Object.getPrototypeOf(page) as Patchable);
        wrapRouteFromHAR(Object.getPrototypeOf(page.context()) as Patchable);

        return;
    }

    wrapRouteFromHAR(Object.getPrototypeOf(target) as Patchable);
}
