import type { Entry } from '../har';

import { createRequestKeyFromEntry } from './requestKeyService';

/**
 * Adds the x-tests-duplicate-id header only for duplicate requests.
 *
 * The first request remains without a header for backward compatibility with old HAR files.
 * Starting from the second, requests receive headers: 2, 3, 4...
 *
 */
export const markIdenticalRequests = (entries: Entry[]) => {
    const currentCounts = new Map<string, number>();

    entries.forEach((entry) => {
        const key = createRequestKeyFromEntry(entry);
        const currentCount = (currentCounts.get(key) || 0) + 1;
        currentCounts.set(key, currentCount);

        // Add header only if this is not the first instance (currentCount > 1)
        if (currentCount > 1) {
            entry.request.headers.push({
                name: 'x-tests-duplicate-id',
                value: String(currentCount),
            });
        }
    });

    return entries;
};
