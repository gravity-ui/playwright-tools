import { setState } from '../../data/storageStates';

import { getStorageState } from './getStorageState';
import type { AuthActions } from './getStorageState';

/**
 * Performs authentication in a separate browser context and saves a snapshot of the browser storage by the given key
 *
 * @param key The key to save the browser storage state with
 * @param authActions Authentication actions
 */
export async function saveStorageStateFor(key: string, authActions: AuthActions) {
    const storageState = await getStorageState(authActions);

    setState(key, storageState);
}
