import { getPlaywrightCoreModule } from './getPlaywrightCoreModule';
import type { Entry } from './types';

export type FlushTransformFunction = (entries: Entry[]) => Entry[];

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function wrapHarRecorderMethods(HarRecorder: any, transform: FlushTransformFunction) {
    const originalFlush = HarRecorder.prototype.flush;

    if (originalFlush) {
        HarRecorder.prototype.flush = function flush(this: any) {
            if (transform) {
                // Transform requests when transform function is present
                this._entries = transform(this._entries);
            }

            // Call the original method
            return originalFlush.call(this);
        };
    } else {
        throw new Error('Can\'t find "flush" method in "HarRecorder" class.');
    }
}

let patchInited = false;

function initHarRecorderPatch(transform: FlushTransformFunction) {
    patchInited = true;

    const modules = getPlaywrightCoreModule('lib/server/har/harRecorder');

    for (const module of modules) {
        wrapHarRecorderMethods(module.HarRecorder, transform);
    }
}

/**
 * Allows making changes to the JSON that will be written to the HAR file
 */
export function addFlushTransform(transform: FlushTransformFunction) {
    if (!patchInited) {
        initHarRecorderPatch(transform);
    }
}
