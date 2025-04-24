import type { BrowserContext } from '@playwright/test';

import type { StorageState } from '../../data/storageStates';

import { restoreCookies } from './restoreCookies';
import { restoreLocalStorage } from './restoreLocalStorage';

/**
 * Восстанавливает сохранённое браузерное хранилище
 *
 * @param context Контекст браузера
 * @param storageState Снимок браузерного хранилища
 * @param append Добавить к существующему хранилищу (иначе — сначала чистим)
 */
export async function applyStorageState(
    context: BrowserContext,
    storageState: StorageState,
    append = false,
) {
    await restoreCookies(context, storageState.cookies, append);
    await restoreLocalStorage(context, storageState.origins, append);
}
