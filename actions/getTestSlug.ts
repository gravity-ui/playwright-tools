import type { Page } from '@playwright/test';

import { testSlugs } from '../data/testSlugs';

/**
 * Возвращает идентификатор (slug) теста
 */
export function getTestSlug(page: Page) {
    if (testSlugs.has(page)) {
        return testSlugs.get(page)!;
    }

    throw new Error("Can't find slug for test");
}
