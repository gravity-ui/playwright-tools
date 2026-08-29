import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { basename, dirname, join } from 'node:path';

import type { BrowserContext, Page } from '@playwright/test';

import type { HARFile, LocalUtilsHarLookupParams, LocalUtilsHarLookupResult } from '../types';
import { harJsonStringify } from '../vendor/harJsonStringify';
import { readZipEntries, writeZipEntries } from '../vendor/zip';

import { degrade } from './diagnostics';
import { getHarTransforms } from './transformRegistry';

const LOOKUP_PATCHED = Symbol.for('@gravity-ui/playwright-tools/har-lookup-patched');

type HarLookup = (params: LocalUtilsHarLookupParams) => Promise<LocalUtilsHarLookupResult>;

type LocalUtils = {
    harLookup: HarLookup;
};

type ConnectionOwner = {
    _connection?: {
        localUtils?: () => LocalUtils | undefined;
    };
};

/**
 * `LocalUtils.harLookup` is the seam the client-side `HarRouter` calls; it exists
 * since Playwright 1.51 (before that the router went through the raw channel) and
 * is out of process for a thin client. Probing the method covers both cases.
 */
function getLocalUtils(target: Page | BrowserContext): LocalUtils | undefined {
    try {
        const localUtils = (target as unknown as ConnectionOwner)._connection?.localUtils?.();

        return typeof localUtils?.harLookup === 'function' ? localUtils : undefined;
    } catch {
        return undefined;
    }
}

/**
 * Wraps `LocalUtils.harLookup` so that the registered lookup transforms see
 * exactly the parameters and the result Playwright itself passes around.
 * Installed once per process — the object is a per-connection singleton.
 */
function patchHarLookup(localUtils: LocalUtils): void {
    const patchable = localUtils as unknown as Record<symbol, unknown>;

    if (patchable[LOOKUP_PATCHED]) {
        return;
    }

    const original = localUtils.harLookup.bind(localUtils);

    // eslint-disable-next-line no-param-reassign -- intentional instance patching
    localUtils.harLookup = async (params: LocalUtilsHarLookupParams) => {
        const { lookupParams, lookupResult } = getHarTransforms();
        const nextParams = lookupParams ? lookupParams(params) : params;
        const result = await original(nextParams);

        return lookupResult ? await lookupResult(result, nextParams) : result;
    };

    patchable[LOOKUP_PATCHED] = true;
}

async function writeTransformedHar(file: string, harFile: HARFile): Promise<string> {
    const content = Buffer.from(harJsonStringify(harFile), 'utf8');

    if (!file.endsWith('.zip')) {
        // `content._file` entries are resolved relative to the HAR file, so the
        // rewritten copy has to stay next to the original.
        const target = join(dirname(file), `${basename(file)}.replay.har`);

        await writeFile(target, content);

        return target;
    }

    const entries = await readZipEntries(file);
    const harName = [...entries.keys()].find((name) => name.endsWith('.har'));

    if (harName === undefined) {
        throw new Error(`Specified archive does not have a .har file: ${file}`);
    }

    entries.set(harName, content);

    const directory = await mkdtemp(join(tmpdir(), 'playwright-tools-har-'));
    const target = join(directory, basename(file));

    await writeZipEntries(target, entries);

    return target;
}

/**
 * Applies the registered open transform by materialising a rewritten copy of the
 * dump, so that Playwright's own HAR backend parses the already-transformed file.
 * Returns the path to route from, plus a cleanup callback.
 */
async function prepareHarFile(
    file: string,
): Promise<{ path: string; cleanup?: () => Promise<void> }> {
    const { open } = getHarTransforms();

    if (!open) {
        return { path: file };
    }

    const entries = file.endsWith('.zip') ? await readZipEntries(file) : undefined;
    let harFile: HARFile;

    if (entries) {
        const harName = [...entries.keys()].find((name) => name.endsWith('.har'));
        const content = harName === undefined ? undefined : entries.get(harName);

        if (content === undefined) {
            throw new Error(`Specified archive does not have a .har file: ${file}`);
        }

        harFile = JSON.parse(content.toString('utf8')) as HARFile;
    } else {
        harFile = JSON.parse(await readFile(file, 'utf8')) as HARFile;
    }

    open(harFile);

    const path = await writeTransformedHar(file, harFile);

    return {
        path,
        cleanup: async () => {
            try {
                // `harRouter.dispose()` fires `harClose` without awaiting it, so the
                // backend may still hold the temporary zip open right after
                // `context.close()` resolves. Retry, and never fail the test over a
                // scratch file that could not be removed.
                await rm(file.endsWith('.zip') ? dirname(path) : path, {
                    force: true,
                    recursive: true,
                    maxRetries: 3,
                });
            } catch (error) {
                degrade(
                    'temp-copy-not-removed',
                    'Could not remove the temporary copy of the dump ' +
                        `at ${path}: ${(error as Error).message}`,
                );
            }
        },
    };
}

export type NativeReplayResult = { cleanup?: () => Promise<void> } | undefined;

/**
 * Replays a dump through Playwright's own `routeFromHAR`, keeping its request
 * matching and its response timing, while still honouring the transforms of
 * this package.
 *
 * Returns `undefined` when the seam is not available, so that the caller can
 * fall back to the userland engine.
 */
export async function tryNativeHarReplay(
    target: Page | BrowserContext,
    routeFromHAR: (har: string, options: Record<string, unknown>) => Promise<void>,
    file: string,
    options: Record<string, unknown>,
): Promise<NativeReplayResult> {
    const localUtils = getLocalUtils(target);

    if (!localUtils) {
        degrade(
            'no-lookup-seam',
            'LocalUtils.harLookup is not reachable (Playwright older than 1.51, or a thin client). ' +
                'Falling back to the built-in replay engine.',
        );

        return undefined;
    }

    patchHarLookup(localUtils);

    const { path, cleanup } = await prepareHarFile(file);

    try {
        await routeFromHAR.call(target, path, options);
    } catch (error) {
        await cleanup?.();

        throw error;
    }

    return { cleanup };
}
