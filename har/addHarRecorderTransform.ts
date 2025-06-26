import { getPlaywrightCoreModule } from './getPlaywrightCoreModule';
import type { Entry } from './types';

export type EntryTransformFunction = (entry: Entry) => void;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function wrapHarRecorderMethods(HarRecorder: any, transform: EntryTransformFunction) {
    const originalOnEntryFinished = HarRecorder.prototype.onEntryFinished;

    if (originalOnEntryFinished) {
        // eslint-disable-next-line no-param-reassign
        HarRecorder.prototype.onEntryFinished = function onEntryFinished(
            entry: Entry,
            ...rest: unknown[]
        ) {
            if (entry) {
                transform(entry);
            }

            return originalOnEntryFinished(entry, rest);
        };
    } else {
        throw new Error('Can\'t find "onEntryFinished" method in "HarRecorder" class.');
    }
}

let patchInited = false;

function initHarRecorderPatch(transform: EntryTransformFunction) {
    patchInited = true;

    const modules = getPlaywrightCoreModule('lib/server/har/harRecorder');

    for (const module of modules) {
        wrapHarRecorderMethods(module.HarRecorder, transform);
    }
}

/**
 * Allows you to make changes to the JSON that will be written to the HAR file
 */
export function addHarRecorderTransform(transform: EntryTransformFunction) {
    if (!patchInited) {
        initHarRecorderPatch(transform);
    }
}
