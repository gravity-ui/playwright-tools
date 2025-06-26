import type { BrowserContext } from '@playwright/test';

import { deleteCache } from '../utils/deleteCache';
import { readCache } from '../utils/readCache';
import { writeCache } from '../utils/writeCache';

import { cacheSettings } from './cacheSettings';

export type StorageState = Awaited<ReturnType<BrowserContext['storageState']>>;

/**
 * Browser Storage Snapshots
 */
const storageStates = new Map<string, StorageState>();

/**
 * Adds a snapshot to the repository
 */
export function setState(key: string, state: StorageState) {
    storageStates.set(key, state);

    if (cacheSettings.auth.path) {
        void writeCache(cacheSettings.auth.path, key, state).catch((error) => console.warn(error));
    }
}

/**
 * Returns a snapshot from storage
 */
export async function getState(key: string) {
    if (!storageStates.has(key) && cacheSettings.auth.path) {
        const state = await readCache<StorageState>(
            cacheSettings.auth.path,
            key,
            cacheSettings.auth.ttl,
        );

        if (state) {
            storageStates.set(key, state);
        }
    }

    return storageStates.get(key);
}

/**
 * Checks if a snapshot is in the repository
 */
export async function hasState(key: string) {
    return Boolean(await getState(key));
}

/**
 * Deletes a snapshot from storage
 */
export function deleteState(key: string) {
    storageStates.delete(key);

    if (cacheSettings.auth.path) {
        void deleteCache(cacheSettings.auth.path, key);
    }
}
