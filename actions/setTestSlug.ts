import type { Page } from '@playwright/test';

import { testSlugs } from '../data/testSlugs';
import { extractTestSlug } from '../utils/extractTestSlug';

/**
 * Устанавливает идентификатор (slug) теста
 *
 * @param page
 * @param title Название теста, из которого будет извлечён slug
 * @param required Требуется, чтобы в названии был указан slug специальным образом (иначе будет использован сам title)
 */
export function setTestSlug(page: Page, title: string, required = false) {
    let slug = extractTestSlug(title, !required);

    if (!slug) {
        if (required) {
            throw new Error(`Can't extract slug from title "${title}"`);
        }

        slug = title.replace(/<>:"\/\\\|\?\*/, '_');
    }

    testSlugs.set(page, slug);
}
