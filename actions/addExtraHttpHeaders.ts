import type { BrowserContext } from '@playwright/test';

import { extraHttpHeaders } from '../data/extraHttpHeaders';

/**
 * Add headers to internal extraHttpHeaders list and extra HTTP headers in browser context
 */
export async function addExtraHttpHeaders(
    browserContext: BrowserContext,
    additionalHeaders: Record<string, string>,
) {
    if (!extraHttpHeaders.has(browserContext)) {
        extraHttpHeaders.set(browserContext, new Map());
    }

    const headers = extraHttpHeaders.get(browserContext)!;

    for (const [headerName, headerValue] of Object.entries(additionalHeaders)) {
        headers.set(headerName.toLowerCase(), headerValue);
    }

    await browserContext.setExtraHTTPHeaders(Object.fromEntries(headers.entries()));
}
