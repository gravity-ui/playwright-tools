import type { BrowserContext } from '@playwright/test';

import { extraHttpHeaders } from '../data/extraHttpHeaders';

/**
 * Remove header from internal extraHttpHeaders list and extra HTTP headers in browser context
 */
export async function removeExtraHttpHeader(browserContext: BrowserContext, headerName: string) {
    if (!extraHttpHeaders.has(browserContext)) {
        return;
    }

    const headers = extraHttpHeaders.get(browserContext)!;

    headers.delete(headerName.toLowerCase());

    await browserContext.setExtraHTTPHeaders(Object.fromEntries(headers.entries()));
}
