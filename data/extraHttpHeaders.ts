import type { BrowserContext } from '@playwright/test';

/**
 * Store for all current extra HTTP headers per browser context (= test)
 */
export const extraHttpHeaders = new WeakMap<BrowserContext, Map<string, string>>();
