import { randomUUID } from 'node:crypto';

import type { BrowserContext, Page } from '@playwright/test';

import type { LocalUtilsHarLookupParams, LocalUtilsHarLookupResult } from '../types';
import { HarBackend } from '../vendor/harBackend';

import { degrade } from './diagnostics';
import { getHarTransforms } from './transformRegistry';

const LOCAL_UTILS_PATCHED = Symbol.for('@gravity-ui/playwright-tools/har-local-utils-patched');

type HarOpenParams = { file: string };
type HarOpenResult = { harId?: string; error?: string };
type HarCloseParams = { harId: string };

/**
 * The client-side `LocalUtils` calls Playwright's `HarRouter` makes. They exist
 * since Playwright 1.51 (before that the router went through the raw channel)
 * and are missing altogether in a thin client.
 */
type LocalUtils = {
    harOpen: (params: HarOpenParams) => Promise<HarOpenResult>;
    harLookup: (params: LocalUtilsHarLookupParams) => Promise<LocalUtilsHarLookupResult>;
    harClose: (params: HarCloseParams) => Promise<void>;
};

type ConnectionOwner = {
    _connection?: {
        localUtils?: () => Partial<LocalUtils> | undefined;
    };
};

/**
 * Dumps opened by this package instead of Playwright, keyed by the id handed to
 * Playwright's router. `LocalUtils` is a per-connection singleton and the ids are
 * random, so one process-wide map serves every context of the worker.
 */
const ownBackends = new Map<string, HarBackend>();

function getLocalUtils(target: Page | BrowserContext): LocalUtils | undefined {
    try {
        const localUtils = (target as unknown as ConnectionOwner)._connection?.localUtils?.();

        if (
            typeof localUtils?.harOpen === 'function' &&
            typeof localUtils.harLookup === 'function' &&
            typeof localUtils.harClose === 'function'
        ) {
            return localUtils as LocalUtils;
        }

        return undefined;
    } catch {
        return undefined;
    }
}

/**
 * Wraps the three `LocalUtils` calls of Playwright's `HarRouter`, which is the
 * only code that calls them:
 *
 * - `harOpen` opens the dump here whenever an open transform is registered, so the
 *   transform is applied in memory and the file on disk stays as it is. Without
 *   one, Playwright opens the dump itself.
 * - `harLookup` answers from the dump opened here, or from Playwright's own
 *   backend, with the registered lookup transforms around it — the transforms see
 *   exactly the parameters and the result Playwright passes around.
 * - `harClose` releases whichever side opened the dump.
 *
 * Installed once per object — it is a per-connection singleton.
 */
function patchLocalUtils(localUtils: LocalUtils): void {
    const patchable = localUtils as unknown as Record<symbol, unknown>;

    if (patchable[LOCAL_UTILS_PATCHED]) {
        return;
    }

    const original: LocalUtils = {
        harOpen: localUtils.harOpen.bind(localUtils),
        harLookup: localUtils.harLookup.bind(localUtils),
        harClose: localUtils.harClose.bind(localUtils),
    };

    // eslint-disable-next-line no-param-reassign -- intentional instance patching
    localUtils.harOpen = async (params: HarOpenParams) => {
        const { open } = getHarTransforms();

        if (!open) {
            return original.harOpen(params);
        }

        // A missing or malformed dump rejects `routeFromHAR`, as it does natively.
        const backend = await HarBackend.open(params.file);

        open(backend.harFile);

        const harId = randomUUID();

        ownBackends.set(harId, backend);

        return { harId };
    };

    // eslint-disable-next-line no-param-reassign -- intentional instance patching
    localUtils.harLookup = async (params: LocalUtilsHarLookupParams) => {
        const { lookupParams, lookupResult } = getHarTransforms();
        const nextParams = lookupParams ? lookupParams(params) : params;
        const backend = ownBackends.get(nextParams.harId);
        const result = backend
            ? await backend.lookup(
                  nextParams.url,
                  nextParams.method,
                  nextParams.headers,
                  nextParams.postData,
                  nextParams.isNavigationRequest,
              )
            : await original.harLookup(nextParams);

        return lookupResult ? await lookupResult(result, nextParams) : result;
    };

    // eslint-disable-next-line no-param-reassign -- intentional instance patching
    localUtils.harClose = async (params: HarCloseParams) => {
        if (ownBackends.delete(params.harId)) {
            return;
        }

        await original.harClose(params);
    };

    patchable[LOCAL_UTILS_PATCHED] = true;
}

/**
 * Replays a dump through Playwright's own `routeFromHAR`, keeping its router and
 * its response timing, while still honouring the transforms of this package.
 *
 * Returns `false` when the seam is not available, so that the caller can fall
 * back to the userland engine.
 */
export async function tryNativeHarReplay(
    target: Page | BrowserContext,
    routeFromHAR: (har: string, options: Record<string, unknown>) => Promise<void>,
    file: string,
    options: Record<string, unknown>,
): Promise<boolean> {
    const localUtils = getLocalUtils(target);

    if (!localUtils) {
        degrade(
            'no-lookup-seam',
            'LocalUtils.harOpen/harLookup/harClose are not reachable (Playwright older than 1.51, ' +
                'or a thin client). Falling back to the built-in replay engine.',
        );

        return false;
    }

    patchLocalUtils(localUtils);

    await routeFromHAR.call(target, file, options);

    return true;
}
