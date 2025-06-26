import type { Page } from '@playwright/test';

import { addExtraHttpHeader } from '../actions/addExtraHttpHeader';
import { removeExtraHttpHeader } from '../actions/removeExtraHttpHeader';

const HEADER_NAME = 'x-tests-extra-hash';

/**
 * Sets a header that can help differentiate requests with the same parameters.
 */
export async function setExtraHash(page: Page, value: string | null) {
    const context = page.context();

    if (value === null) {
        await removeExtraHttpHeader(context, HEADER_NAME);
    } else {
        await addExtraHttpHeader(context, HEADER_NAME, value);
    }
}
