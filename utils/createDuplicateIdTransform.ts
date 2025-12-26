import type { LocalUtilsHarLookupParams } from '../har';

import { createRequestKeyFromLookupParams } from './requestKeyService';

/**
 * Creates a transformer for automatically adding the x-tests-duplicate-id header
 * to requests when searching in a HAR file.
 *
 * This allows distinguishing identical requests without changing test code.
 *
 * The header is NOT added to the first request (for backward compatibility with old HARs),
 * and is added starting from the second: 2, 3, 4...
 */
export function createDuplicateIdTransform() {
    const requestCounts = new Map<string, number>();

    return (params: LocalUtilsHarLookupParams): LocalUtilsHarLookupParams => {
        const key = createRequestKeyFromLookupParams(params);

        // Increment the counter for this request
        const count = (requestCounts.get(key) || 0) + 1;
        requestCounts.set(key, count);

        // Add header only starting from the second call
        // This ensures backward compatibility with old HAR files,
        // where requests did not have the x-tests-duplicate-id header
        if (count > 1) {
            params.headers.push({
                name: 'x-tests-duplicate-id',
                value: String(count),
            });
        }

        return params;
    };
}
