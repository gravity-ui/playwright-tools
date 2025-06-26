import { getPlaywrightCoreModule } from './getPlaywrightCoreModule';
import type { HARFile } from './types';

export type HarTransformFunction = (harFile: HARFile) => void;

function wrapLocalUtilsDispatcherMethods(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    LocalUtilsDispatcher: any,
    transform: HarTransformFunction,
) {
    const originalHarOpen: Function = LocalUtilsDispatcher.prototype.harOpen;

    if (originalHarOpen) {
        // eslint-disable-next-line no-param-reassign
        LocalUtilsDispatcher.prototype.harOpen = async function harOpen(
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            this: any,
            ...rest: unknown[]
        ) {
            const result = await originalHarOpen.apply(this, rest);

            const harBackends = this._harBackends || this._harBakends;
            const harBackend = harBackends.get(result.harId);
            const harFile: HARFile = harBackend._harFile;

            if (harFile) {
                transform(harFile);
            }

            return result;
        };
    } else {
        throw new Error('Can\'t find "harOpen" method in "LocalUtilsDispatcher" class.');
    }
}

let patchInited = false;

function initLocalUtilsDispatcherPatch(transform: HarTransformFunction) {
    patchInited = true;

    const modules = getPlaywrightCoreModule('lib/server/dispatchers/localUtilsDispatcher');

    for (const module of modules) {
        wrapLocalUtilsDispatcherMethods(module.LocalUtilsDispatcher, transform);
    }
}

/**
 * Allows you to make changes to the JSON read from an open HAR file
 */
export function addHarOpenTransform(transform: HarTransformFunction) {
    if (!patchInited) {
        initLocalUtilsDispatcherPatch(transform);
    }
}
