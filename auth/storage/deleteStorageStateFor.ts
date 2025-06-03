import { deleteState } from '../../data/storageStates';

/**
 * Deletes a snapshot of the browser storage for the given key.
 *
 * @param key The key by which the snapshot of the browser storage is saved
 */
export function deleteStorageStateFor(key: string) {
    return deleteState(key);
}
