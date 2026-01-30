import type { Page } from '@playwright/test';

import { testSlugs } from '../data/testSlugs';

/**
 * Returns the test slug
 */
export function getTestSlug(page: Page) {
    if (testSlugs.has(page)) {
        return testSlugs.get(page)!;
    }

    throw new Error(
        "Can't find slug for test. Probably you need to add testSlug fixture to your test config",
    );
}
