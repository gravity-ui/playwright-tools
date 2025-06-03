import type { BrowserContext } from '@playwright/test';

import type { StorageState } from '../../data/storageStates';

type InitScriptArg = {
    origins: StorageState['origins'];
    append: boolean;
};

/**
 * Restores saved localStorage records in the browser
 *
 * @param context Browser context
 * @param origins List of localStorage entries to restore
 * @param append Append to existing entries (otherwise - clear first)
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
