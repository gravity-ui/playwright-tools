import type { BrowserContext } from '@playwright/test';

import { getState } from '../../data/storageStates';

import { applyStorageState } from './applyStorageState';

/**
 * Восстанавливает сохранённое браузерное хранилище по заданному ключу
 *
 * @param key Ключ, под которых сохранён снимок браузерного хранилища
 * @param context Контекст браузера
 * @param append Добавить к существующему хранилищу (иначе — сначала чистим)
 */
export async function applyStorageStateFor(key: string, context: BrowserContext, append = false) {
    const storageState = await getState(key);

    if (!storageState) {
        throw new Error(`Can't find storageState for "${key}"`);
    }

    await applyStorageState(context, storageState, append);
}
