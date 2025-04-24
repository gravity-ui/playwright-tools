import type { BrowserContext } from '@playwright/test';

import { extraHttpHeaders } from '../data/extraHttpHeaders';

/**
 * Return extra HTTP headers list from internal extraHttpHeaders list
 */
export function getExtraHttpHeaders(browserContext: BrowserContext) {
    if (!extraHttpHeaders.has(browserContext)) {
        return {};
    }

    const headers = extraHttpHeaders.get(browserContext)!;

    return Object.fromEntries(headers.entries());
}
