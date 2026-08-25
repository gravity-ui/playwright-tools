import type { HarTransformFunction } from './engine/transformRegistry';
import { registerLegacyTransforms } from './engine/transformRegistry';

export type { HarTransformFunction } from './engine/transformRegistry';

/**
 * Allows you to make changes to the JSON read from an open HAR file
 */
export function addHarOpenTransform(transform: HarTransformFunction) {
    registerLegacyTransforms('open', { open: transform });
}
