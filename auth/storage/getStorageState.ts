import { chromium } from '@playwright/test';
import type { Page } from '@playwright/test';

export type AuthActions = (page: Page) => Promise<void>;

/**
 * Performs authentication in a separate browser context and returns
 * a snapshot of the browser storage
 *
 * @param authActions Authentication actions
 */

export async function getStorageState(authActions: AuthActions) {
    const browser = await chromium.launch();
    const page = await browser.newPage();

    await authActions(page);

    const storageState = await page.context().storageState();

    await browser.close();

    return storageState;
}
