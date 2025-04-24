import type { Page } from '@playwright/test';

/**
 * Хранилище идентификаторов (slug) тестов по странице теста
 */
export const testSlugs = new WeakMap<Page, string>();
