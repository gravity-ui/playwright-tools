import type { BrowserContext } from '@playwright/test';

import { extraHttpHeaders } from '../data/extraHttpHeaders';

/**
 * Return extra HTTP header value from internal extraHttpHeaders list
 */
export function getExtraHttpHeader(browserContext: BrowserContext, headerName: string) {
    if (!extraHttpHeaders.has(browserContext)) {
        return undefined;
    }

    const headers = extraHttpHeaders.get(browserContext)!;

    return headers.get(headerName.toLowerCase());
}
