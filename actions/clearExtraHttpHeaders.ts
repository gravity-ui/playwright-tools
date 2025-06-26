import type { BrowserContext } from '@playwright/test';

import { extraHttpHeaders } from '../data/extraHttpHeaders';

/**
 * Clear internal extraHttpHeaders list and extra HTTP headers in browser context
 */
export async function clearExtraHttpHeaders(browserContext: BrowserContext) {
    if (!extraHttpHeaders.has(browserContext)) {
        return;
    }

    const headers = extraHttpHeaders.get(browserContext)!;

    headers.clear();

    await browserContext.setExtraHTTPHeaders({});
}
