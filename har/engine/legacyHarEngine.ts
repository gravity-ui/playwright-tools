import { getPlaywrightCoreModules } from '../getPlaywrightCoreModule';
import type {
    Entry,
    HARFile,
    LocalUtilsHarLookupParams,
    LocalUtilsHarLookupResult,
} from '../types';

import { getHarTransforms, markReplayOpened } from './transformRegistry';

const HAR_RECORDER_PATH = 'lib/server/har/harRecorder';
const LOCAL_UTILS_DISPATCHER_PATH = 'lib/server/dispatchers/localUtilsDispatcher';

type PlaywrightCoreModule = Record<string, unknown>;
type PatchablePrototype = Record<string, unknown>;
type Patch = {
    method: string;
    prototype: PatchablePrototype;
    replacement: (this: unknown, ...args: never[]) => unknown;
};
type LegacyModules = {
    dispatchers: PlaywrightCoreModule[];
    recorders: PlaywrightCoreModule[];
};

let cachedModules: LegacyModules | null | undefined;
let installed = false;

function getLegacyModules(): LegacyModules | undefined {
    if (cachedModules !== undefined) {
        return cachedModules ?? undefined;
    }

    const recorders = getPlaywrightCoreModules(HAR_RECORDER_PATH);
    const dispatchers = getPlaywrightCoreModules(LOCAL_UTILS_DISPATCHER_PATH);

    cachedModules =
        recorders.length > 0 && dispatchers.length > 0 ? { dispatchers, recorders } : null;

    return cachedModules ?? undefined;
}

export type HarEngineTier = 'legacy' | 'public-api';

export function getHarEngineTier(): HarEngineTier {
    return getLegacyModules() ? 'legacy' : 'public-api';
}

function getPrototype(
    module: PlaywrightCoreModule,
    exportName: 'HarRecorder' | 'LocalUtilsDispatcher',
): PatchablePrototype {
    const constructor = module[exportName] as { prototype?: PatchablePrototype } | undefined;

    if (!constructor?.prototype) {
        throw new Error(`Can't find "${exportName}" class in playwright-core.`);
    }

    return constructor.prototype;
}

function applyPatches(patches: Patch[]): void {
    const originals = patches.map(({ method, prototype }) => {
        const original = prototype[method];

        if (typeof original !== 'function') {
            throw new Error(`Can't find "${method}" method in playwright-core.`);
        }

        return original;
    });

    let applied = 0;

    try {
        for (const [index, patch] of patches.entries()) {
            patch.prototype[patch.method] = patch.replacement;
            applied = index + 1;
        }
    } catch (error) {
        for (let index = applied - 1; index >= 0; index--) {
            const patch = patches[index];

            if (patch) {
                patch.prototype[patch.method] = originals[index];
            }
        }

        throw error;
    }
}

function recorderPatches(modules: PlaywrightCoreModule[], call: 'recorder' | 'flush'): Patch[] {
    return modules.map((module) => {
        const prototype = getPrototype(module, 'HarRecorder');

        if (call === 'recorder') {
            const original = prototype.onEntryFinished as (
                this: unknown,
                entry: Entry,
                ...rest: unknown[]
            ) => unknown;

            return {
                method: 'onEntryFinished',
                prototype,
                replacement(this: unknown, entry: Entry, ...rest: unknown[]) {
                    getHarTransforms().recorder?.(entry);

                    return original.call(this, entry, ...rest);
                },
            } as Patch;
        }

        const original = prototype.flush as (
            this: { _entries: Entry[] },
            ...rest: unknown[]
        ) => unknown;

        return {
            method: 'flush',
            prototype,
            replacement(this: { _entries: Entry[] }, ...rest: unknown[]) {
                const { flush } = getHarTransforms();

                if (flush) {
                    this._entries = flush(this._entries);
                }

                return original.call(this, ...rest);
            },
        } as Patch;
    });
}

function dispatcherPatches(modules: PlaywrightCoreModule[], call: 'lookup' | 'open'): Patch[] {
    return modules.map((module) => {
        const prototype = getPrototype(module, 'LocalUtilsDispatcher');

        if (call === 'lookup') {
            const original = prototype.harLookup as (
                this: unknown,
                params: LocalUtilsHarLookupParams,
                metadata?: unknown,
                ...rest: unknown[]
            ) => Promise<LocalUtilsHarLookupResult>;

            return {
                method: 'harLookup',
                prototype,
                async replacement(
                    this: unknown,
                    params: LocalUtilsHarLookupParams,
                    metadata?: unknown,
                    ...rest: unknown[]
                ) {
                    markReplayOpened();

                    const { lookupParams, lookupResult } = getHarTransforms();
                    const nextParams = lookupParams ? lookupParams(params) : params;
                    const result = await original.call(this, nextParams, metadata, ...rest);

                    return lookupResult ? lookupResult(result, nextParams) : result;
                },
            } as Patch;
        }

        type Dispatcher = {
            _harBackends?: Map<string, { _harFile?: HARFile }>;
            _harBakends?: Map<string, { _harFile?: HARFile }>;
        };
        type HarOpenResult = { harId: string };

        const original = prototype.harOpen as (
            this: Dispatcher,
            ...args: unknown[]
        ) => Promise<HarOpenResult>;

        return {
            method: 'harOpen',
            prototype,
            async replacement(this: Dispatcher, ...args: unknown[]) {
                markReplayOpened();

                const result = await original.apply(this, args);
                const backends = this._harBackends ?? this._harBakends;
                const harFile = backends?.get(result.harId)?._harFile;

                if (harFile) {
                    getHarTransforms().open?.(harFile);
                }

                return result;
            },
        } as Patch;
    });
}

/**
 * Installs the historical patches for all four hooks at once. Every patch reads
 * the registry lazily, so an unused hook is a pass-through. Returns `false` on
 * the public-API tier; a failed attempt remains retryable.
 */
export function installLegacyHarEngine(): boolean {
    const modules = getLegacyModules();

    if (!modules) {
        return false;
    }

    if (installed) {
        return true;
    }

    applyPatches([
        ...recorderPatches(modules.recorders, 'recorder'),
        ...recorderPatches(modules.recorders, 'flush'),
        ...dispatcherPatches(modules.dispatchers, 'lookup'),
        ...dispatcherPatches(modules.dispatchers, 'open'),
    ]);
    installed = true;

    return true;
}
