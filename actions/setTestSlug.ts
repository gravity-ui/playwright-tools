import type { Page } from '@playwright/test';

import { testSlugs } from '../data/testSlugs';
import { extractTestSlug } from '../utils/extractTestSlug';

/**
 * Sets the test slug
 *
 * @param page
 * @param title The name of the test from which the slug will be extracted
 * @param required Requires the slug to be specified in a specific way in the title (otherwise the title itself will be used)
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
