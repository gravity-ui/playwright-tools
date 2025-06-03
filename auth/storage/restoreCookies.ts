import type { BrowserContext } from '@playwright/test';

import type { StorageState } from '../../data/storageStates';

/**
 * Restores saved cookies in the browser
 *
 * @param context Browser context
 * @param cookies List of cookies to restore
 * @param append Add to existing cookies (otherwise - clear first)
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
