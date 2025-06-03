import { hasState } from '../../data/storageStates';

/**
 * Checks if there is a snapshot of the browser storage for the given key
 *
 * @param key The key by which the snapshot of the browser storage is saved
 */
export function hasStorageStateFor(key: string) {
    return hasState(key);
}
