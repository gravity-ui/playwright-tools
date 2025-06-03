import { getState } from '../../data/storageStates';

/**
 * Returns a snapshot of the browser storage for the given key.
 *
 * @param key The key by which the snapshot of the browser storage is saved
 */
export function getStorageStateFor(key: string) {
    return getState(key);
}
