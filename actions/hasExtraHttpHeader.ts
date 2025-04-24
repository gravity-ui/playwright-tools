import type { BrowserContext } from '@playwright/test';

import { extraHttpHeaders } from '../data/extraHttpHeaders';

/**
 * Check existence of the extra HTTP header in internal extraHttpHeaders list
 */
export function hasExtraHttpHeader(browserContext: BrowserContext, headerName: string) {
    if (!extraHttpHeaders.has(browserContext)) {
        return false;
    }

    const headers = extraHttpHeaders.get(browserContext)!;

    return headers.has(headerName.toLowerCase());
}
