import type { BrowserContext } from '@playwright/test';

import { getState } from '../../data/storageStates';

import { applyStorageState } from './applyStorageState';

/**
 * Restores saved browser storage by the given key
 *
 * @param key The key by which the snapshot of the browser storage is saved
 * @param context Browser context
 * @param append Add to existing storage (otherwise - clean first)
 */
export async function applyStorageStateFor(key: string, context: BrowserContext, append = false) {
    const storageState = await getState(key);

    if (!storageState) {
        throw new Error(`Can't find storageState for "${key}"`);
    }

    await applyStorageState(context, storageState, append);
}
