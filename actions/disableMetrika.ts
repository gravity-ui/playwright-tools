import type { Page } from '@playwright/test';

/**
 * Отключает выбранные счётчики Метрики через стандартное апи
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
