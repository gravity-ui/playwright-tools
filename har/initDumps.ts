import { access } from 'node:fs/promises';
import { relative, resolve } from 'node:path';

import type { Page, TestInfo } from '@playwright/test';

import { getTestSlug } from '../actions';
import { extractTestSlug } from '../utils/extractTestSlug';

export type InitDumpsOptions = {
    /**
     * Путь до корневой директории проекта, относительно которого будет посчитан
     * путь до директории дампов (если не указан, то путь абсолютный)
     */
    rootPath?: string;

    /**
     * Режим записи запросов в файл, вместо чтения из него
     * @defaultValue `false`
     */
    update?: boolean;

    /**
     * Всегда обновлять дампы, если они отсутствуют
     * @defaultValue `false`
     */
    forceUpdateIfHarMissing?: boolean;

    /**
     * Пользовательский таймаут для обновления тестов. Миллисекунды.
     * Полезно при долгих обновлениях
     */
    updateTimeout?: number;

    /**
     * Режим работы для запросов, которые не найдены в архиве
     * @defaultValue `'abort'`
     */
    notFound?: 'abort' | 'fallback';

    /**
     * Шаблон адреса запросов, которые будут обработаны
     */
    url?: string | RegExp;

    /**
     * Упаковать результат в архив
     * @defaultValue `true`
     */
    zip?: boolean;

    /**
     * Пользовательский путь до дампов. По-умолчанию путь вычисляется как
     * testInfo.snapshotPath('').replace(/-snapshots\/[^/]+$/, '-data/' + slug)
     * @param testInfo TestInfo информация о текущем тесте
     * @param slug slug теста
     *
     * @returns string путь до дампа
     */
    dumpsPath?: (testInfo: TestInfo, slug: string) => string;
};

/**
 * Делает необходимые приготовления для сохранения дампов запросов
 */
export async function initDumps(
    page: Page,
    testInfo: TestInfo,
    {
        dumpsPath: dumpsPathBuilder = defaultPathBuilder,
        rootPath,
        forceUpdateIfHarMissing = false,
        updateTimeout,
        notFound = 'abort',
        url,
        zip = true,
        update = false,
    }: InitDumpsOptions = {},
) {
    let slug: string;

    try {
        slug = getTestSlug(page);
    } catch (error) {
        console.warn(error);
        // Backward compatibility
        slug = extractTestSlug(testInfo.title, true);
    }

    let dumpsPath = dumpsPathBuilder(testInfo, slug);

    if (rootPath) {
        dumpsPath = relative(rootPath, dumpsPath);
    }

    const harPath = resolve(dumpsPath, zip ? 'har.zip' : 'har.har');

    if (forceUpdateIfHarMissing) {
        try {
            await access(harPath);
        } catch {
            // eslint-disable-next-line no-param-reassign
            update = true;
        }
    }

    if (update && updateTimeout) {
        testInfo.setTimeout(updateTimeout);
    }

    console.info(update ? 'Write requests to' : 'Read requests from', harPath);

    await page.context().routeFromHAR(harPath, {
        update,
        notFound,
        url,
    });
}

function defaultPathBuilder(testInfo: TestInfo, slug: string) {
    return testInfo.snapshotPath('').replace(/-snapshots\/[^/]+$/, '-data/' + slug);
}
