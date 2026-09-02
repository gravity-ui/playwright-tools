import { installHarEngine } from './engine/installHarEngine';
import type { EntryTransformFunction } from './engine/transformRegistry';
import { registerLegacyTransforms } from './engine/transformRegistry';

export type { EntryTransformFunction } from './engine/transformRegistry';

/**
 * Allows you to make changes to the JSON that will be written to the HAR file
 *
 * The transform is applied to every entry of the recorded dump, in document
 * order, right before it is written to its final location.
 *
 * The first call wins for the whole worker process; later calls are ignored
 * with a warning.
 */
export function addHarRecorderTransform(transform: EntryTransformFunction) {
    registerLegacyTransforms('recorder', { recorder: transform });
    installHarEngine();
}
