import type { Page } from '@playwright/test';

/**
 * Disables selected Metrica counters via standard API
 * {@see https://yandex.ru/support/metrica/general/user-opt-out.html}
 */
export async function disableMetrika(page: Page, { counters }: { counters: number[] }) {
    await page.addInitScript({
        content: counters.reduce(
            (countersCode, counterId) =>
                `${countersCode}\nwindow['disableYaCounter${counterId}'] = true;`,
            '',
        ),
    });
}
