import type { BrowserContext } from '@playwright/test';

import { extraHttpHeaders } from '../data/extraHttpHeaders';

/**
 * Add header to internal extraHttpHeaders list and extra HTTP headers in browser context
 */
export async function addExtraHttpHeader(
    browserContext: BrowserContext,
    headerName: string,
    headerValue: string,
) {
    if (!extraHttpHeaders.has(browserContext)) {
        extraHttpHeaders.set(browserContext, new Map());
    }

    const headers = extraHttpHeaders.get(browserContext)!;

    headers.set(headerName.toLowerCase(), headerValue);

    await browserContext.setExtraHTTPHeaders(Object.fromEntries(headers.entries()));
}
