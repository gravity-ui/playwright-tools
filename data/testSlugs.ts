import type { Page } from '@playwright/test';

/**
 * Storage of test slugs by test page
 */
export const testSlugs = new WeakMap<Page, string>();
