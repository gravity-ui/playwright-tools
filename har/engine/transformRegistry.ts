import type {
    Entry,
    HARFile,
    LocalUtilsHarLookupParams,
    LocalUtilsHarLookupResult,
} from '../types';

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

const latchedCalls = new Set<LegacyTransformCall>();

let globalSlots: HarTransformSlots = {};
let fixtureSlots: HarTransformSlots = {};

/**
 * Registers the transforms of a legacy `add*Transform` call.
 * Subsequent calls of the same function are ignored, exactly as before.
 */
export function registerLegacyTransforms(
    call: LegacyTransformCall,
    slots: HarTransformSlots,
): void {
    if (latchedCalls.has(call)) {
        return;
    }

    latchedCalls.add(call);
    globalSlots = { ...globalSlots, ...slots };
}

/**
 * Registers transforms owned by a fixture. Unlike the legacy calls these are
 * replaced on every registration, so per-test state does not leak between tests.
 */
export function setFixtureHarTransforms(slots: HarTransformSlots): void {
    fixtureSlots = slots;
}

export function getHarTransforms(): HarTransformSlots {
    return {
        open: globalSlots.open ?? fixtureSlots.open,
        lookupParams: globalSlots.lookupParams ?? fixtureSlots.lookupParams,
        lookupResult: globalSlots.lookupResult ?? fixtureSlots.lookupResult,
        recorder: globalSlots.recorder ?? fixtureSlots.recorder,
        flush: globalSlots.flush ?? fixtureSlots.flush,
    };
}

/**
 * Test seam: drops registered transforms.
 * Pass `{global: true}` to also release the legacy first-call-wins latches.
 */
export function resetHarTransforms({ global = false }: { global?: boolean } = {}): void {
    fixtureSlots = {};

    if (global) {
        globalSlots = {};
        latchedCalls.clear();
    }
}
