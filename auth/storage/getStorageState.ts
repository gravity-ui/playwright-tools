import { chromium } from '@playwright/test';
import type { Page } from '@playwright/test';

export type AuthActions = (page: Page) => Promise<void>;

/**
 * Выполняет аутентификацию в отдельном браузерном контексте и возвращает
 * снимок браузерного хранилища
 *
 * @param authActions Действия по аутентификации
 */
export async function getStorageState(authActions: AuthActions) {
    const browser = await chromium.launch();
    const page = await browser.newPage();

    await authActions(page);

    const storageState = await page.context().storageState();

    await browser.close();

    return storageState;
}
