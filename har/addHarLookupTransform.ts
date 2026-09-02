import { installHarEngine } from './engine/installHarEngine';
import type {
    HarLookupParamsTransformFunction,
    HarLookupResultTransformFunction,
} from './engine/transformRegistry';
import { registerLegacyTransforms } from './engine/transformRegistry';

export type {
    HarLookupParamsTransformFunction,
    HarLookupResultTransformFunction,
} from './engine/transformRegistry';

/**
 * Allows you to make modifications at the stage of searching for a record in the dump that matches the request
 * @param transformParams Function for changing the parameters on the basis of which the search will be performed
 * @param transformResult Function for changing the search result (here you can change the parameters of the found answer, for example its body)
 *
 * The first call wins for the whole worker process; later calls are ignored
 * with a warning.
 */
export function addHarLookupTransform(
    transformParams?: HarLookupParamsTransformFunction,
    transformResult?: HarLookupResultTransformFunction,
) {
    registerLegacyTransforms('lookup', {
        lookupParams: transformParams,
        lookupResult: transformResult,
    });
    installHarEngine();
}
