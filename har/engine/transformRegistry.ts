import type {
    Entry,
    HARFile,
    LocalUtilsHarLookupParams,
    LocalUtilsHarLookupResult,
} from '../types';

import { degrade } from './diagnostics';

export type HarTransformFunction = (harFile: HARFile) => void;

export type HarLookupParamsTransformFunction = (
    params: LocalUtilsHarLookupParams,
) => LocalUtilsHarLookupParams;

export type HarLookupResultTransformFunction = (
    result: LocalUtilsHarLookupResult,
    params: LocalUtilsHarLookupParams,
) => LocalUtilsHarLookupResult | Promise<LocalUtilsHarLookupResult>;

export type EntryTransformFunction = (entry: Entry) => void;

export type FlushTransformFunction = (entries: Entry[]) => Entry[];

export type HarTransformSlots = {
    open?: HarTransformFunction;
    lookupParams?: HarLookupParamsTransformFunction;
    lookupResult?: HarLookupResultTransformFunction;
    recorder?: EntryTransformFunction;
    flush?: FlushTransformFunction;
};

/**
 * One latch per legacy `add*Transform` function, matching the historical behaviour:
 * the first call to a given function wins, later calls are ignored.
 */
export type LegacyTransformCall = 'lookup' | 'open' | 'recorder' | 'flush';

type Store = {
    version: number;
    globalSlots: HarTransformSlots;
    fixtureSlots: HarTransformSlots;
    /** The slots each legacy call was latched with, to tell a repeat from a conflict. */
    latched: Map<LegacyTransformCall, HarTransformSlots>;
    /** Set once any dump has been opened for replay in this worker process. */
    replayOpened: boolean;
};

/**
 * The registry lives on `globalThis`, so that every copy of the package in the
 * worker process shares it: a transform registered through one copy is applied
 * by the engine another copy installed, as it used to be when all copies patched
 * the one `playwright-core`.
 */
const STORE_KEY = Symbol.for('@gravity-ui/playwright-tools/har-transforms');
const STORE_VERSION = 1;

function createStore(): Store {
    return {
        version: STORE_VERSION,
        globalSlots: {},
        fixtureSlots: {},
        latched: new Map(),
        replayOpened: false,
    };
}

let localStore: Store | undefined;

function getStore(): Store {
    if (localStore) {
        return localStore;
    }

    const host = globalThis as Record<symbol, unknown>;
    const shared = host[STORE_KEY] as Store | undefined;

    if (shared?.version === STORE_VERSION) {
        localStore = shared;
    } else if (shared) {
        degrade(
            'registry-version-mismatch',
            'Another copy of @gravity-ui/playwright-tools in this worker uses an incompatible ' +
                'transform registry; transforms registered through this copy are kept apart. ' +
                'Deduplicate the dependency.',
        );
        localStore = createStore();
    } else {
        localStore = createStore();
        host[STORE_KEY] = localStore;
    }

    return localStore;
}

function sameSlots(left: HarTransformSlots, right: HarTransformSlots): boolean {
    const keys = new Set([
        ...Object.keys(left),
        ...Object.keys(right),
    ] as (keyof HarTransformSlots)[]);

    return [...keys].every((key) => left[key] === right[key]);
}

/**
 * Registers the transforms of a legacy `add*Transform` call.
 * Subsequent calls of the same function are ignored, exactly as before, with a
 * warning when they carry a different function.
 *
 * An open transform is consumed when `routeFromHAR()` opens the dump, so it can
 * no longer apply to a dump that is already open: registering one after a replay
 * has started in this worker process throws instead of silently doing nothing.
 */
export function registerLegacyTransforms(
    call: LegacyTransformCall,
    slots: HarTransformSlots,
): void {
    const store = getStore();
    const previous = store.latched.get(call);

    if (previous) {
        if (!sameSlots(previous, slots)) {
            degrade(
                `transform-registered-twice:${call}`,
                `${call}: the first registration in this worker process wins and this later ` +
                    'one is ignored. Combine the recipes into one call, or register per test ' +
                    'through setFixtureHarTransforms().',
            );
        }

        return;
    }

    if (call === 'open' && store.replayOpened) {
        throw new Error(
            '[@gravity-ui/playwright-tools] addHarOpenTransform() was called after routeFromHAR() ' +
                'had already opened a dump in this worker process, so the transform cannot apply ' +
                'to it. Register it before initDumps() / routeFromHAR(): at module level, or in a ' +
                'fixture that runs earlier.',
        );
    }

    store.latched.set(call, slots);
    store.globalSlots = { ...store.globalSlots, ...slots };
}

/**
 * Registers transforms owned by a fixture. Unlike the legacy calls these are
 * replaced on every registration, so per-test state does not leak between tests.
 */
export function setFixtureHarTransforms(slots: HarTransformSlots): void {
    getStore().fixtureSlots = slots;
}

export function getHarTransforms(): HarTransformSlots {
    const { globalSlots, fixtureSlots } = getStore();

    return {
        open: globalSlots.open ?? fixtureSlots.open,
        lookupParams: globalSlots.lookupParams ?? fixtureSlots.lookupParams,
        lookupResult: globalSlots.lookupResult ?? fixtureSlots.lookupResult,
        recorder: globalSlots.recorder ?? fixtureSlots.recorder,
        flush: globalSlots.flush ?? fixtureSlots.flush,
    };
}

/** Records that a dump has been opened for replay, see `registerLegacyTransforms`. */
export function markReplayOpened(): void {
    getStore().replayOpened = true;
}

/**
 * Test seam: drops registered transforms.
 * Pass `{global: true}` to also release the legacy first-call-wins latches.
 */
export function resetHarTransforms({ global = false }: { global?: boolean } = {}): void {
    const store = getStore();

    store.fixtureSlots = {};

    if (global) {
        store.globalSlots = {};
        store.latched.clear();
        store.replayOpened = false;
    }
}
