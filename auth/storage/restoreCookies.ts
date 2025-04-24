import type { BrowserContext } from '@playwright/test';

import type { StorageState } from '../../data/storageStates';

/**
 * Восстанавливает в браузере сохранённые куки
 *
 * @param context Контекст браузера
 * @param cookies Перечень кук для восстановления
 * @param append Добавить к существующим кукам (иначе — сначала чистим)
 */
export async function restoreCookies(
    context: BrowserContext,
    cookies: StorageState['cookies'],
    append = false,
) {
    if (!append) {
        await context.clearCookies();
    }

    await context.addCookies(cookies);
}
