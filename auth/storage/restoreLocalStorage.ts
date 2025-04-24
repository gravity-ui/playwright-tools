import type { BrowserContext } from '@playwright/test';

import type { StorageState } from '../../data/storageStates';

type InitScriptArg = {
    origins: StorageState['origins'];
    append: boolean;
};

/**
 * Восстанавливает в браузере сохранённые записи localStorage
 *
 * @param context Контекст браузера
 * @param origins Перечень записей в localStorage для восстановления
 * @param append Добавить к существующим записям (иначе — сначала чистим)
 */
export async function restoreLocalStorage(
    context: BrowserContext,
    origins: StorageState['origins'],
    append = false,
) {
    await context.addInitScript(
        ({ origins, append }: InitScriptArg) => {
            const currentOrigin = `${location.protocol}://${location.hostname}`;

            if (!append) {
                window.localStorage.clear();
            }

            for (const { origin, localStorage } of origins) {
                if (origin !== currentOrigin) {
                    continue;
                }

                for (const { name, value } of localStorage) {
                    window.localStorage.setItem(name, value);
                }
            }
        },
        { origins, append },
    );
}
