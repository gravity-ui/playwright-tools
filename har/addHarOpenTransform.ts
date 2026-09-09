import { installHarEngine } from './engine/installHarEngine';
import type { HarTransformFunction } from './engine/transformRegistry';
import { registerLegacyTransforms } from './engine/transformRegistry';

export type { HarTransformFunction } from './engine/transformRegistry';

/**
 * Allows you to make changes to the JSON read from an open HAR file
 *
 * The transform is consumed when `routeFromHAR()` opens the dump, so it has to be
 * registered before `initDumps()` / `routeFromHAR()` — at module level or in a
 * fixture that runs earlier. Registering it after a dump has already been opened
 * in the worker throws. The first call wins for the whole worker process; later
 * calls are ignored with a warning.
 */
export function addHarOpenTransform(transform: HarTransformFunction) {
    registerLegacyTransforms('open', { open: transform });
    installHarEngine();
}
