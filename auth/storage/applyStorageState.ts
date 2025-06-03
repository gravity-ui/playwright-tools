import type { BrowserContext } from '@playwright/test';

import type { StorageState } from '../../data/storageStates';

import { restoreCookies } from './restoreCookies';
import { restoreLocalStorage } from './restoreLocalStorage';

/**
 * Restores saved browser storage
 *
 * @param context Browser context
 * @param storageState Browser Storage Snapshot
 * @param append Append to existing storage (otherwise - clean first)
 */
export async function applyStorageState(
    context: BrowserContext,
    storageState: StorageState,
    append = false,
) {
    await restoreCookies(context, storageState.cookies, append);
    await restoreLocalStorage(context, storageState.origins, append);
}
