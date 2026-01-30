import type { Page } from '@playwright/test';

import { testSlugs } from '../data/testSlugs';
import { extractTestSlug } from '../utils/extractTestSlug';

/**
 * Sets the test slug by extracting from title or generating from title
 *
 * @param page
 * @param title The name of the test from which the slug will be extracted
 */
export function setTestSlug(page: Page, title: string) {
    // Try to extract slug from [slug] pattern in title
    let slug = extractTestSlug(title, true);

    // Fallback: if extraction failed, use the generated slug from title
    if (!slug) {
        slug = title.replace(/[<>:"/\\|?*]/g, '_');
    }

    testSlugs.set(page, slug);
}
