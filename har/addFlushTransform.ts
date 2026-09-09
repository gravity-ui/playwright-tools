import { installHarEngine } from './engine/installHarEngine';
import type { FlushTransformFunction } from './engine/transformRegistry';
import { registerLegacyTransforms } from './engine/transformRegistry';

export type { FlushTransformFunction } from './engine/transformRegistry';

/**
 * Allows making changes to the JSON that will be written to the HAR file
 *
 * The transform is called once with the full list of recorded entries, after
 * the per-entry transform of `addHarRecorderTransform`.
 *
 * The first call wins for the whole worker process; later calls are ignored
 * with a warning.
 */
export function addFlushTransform(transform: FlushTransformFunction) {
    registerLegacyTransforms('flush', { flush: transform });
    installHarEngine();
}
