import type { Locator } from '@playwright/test';
import { expect } from '@playwright/test';

import { globalSettings } from '../data/globalSettings';

/**
 * Waits for all elements matching the locator to hide
 *
 * Optionally checks that the element was initially visible (wait for it to appear).
 * If the element has not become visible after the timeout (300 ms by default),
 * then it is considered that it managed to hide before that, this does not cause an error.
 *
 * @param locator Locator of elements that should hide
 * @param waitForVisible Enable checking that it is initially present
 * (if `true` - with the default timeout, if a number - with the specified one)
 */

export async function assertElementsHidden(
    locator: Locator,
    waitForVisible: boolean | number = false,
) {
    if (waitForVisible !== false) {
        await locator
            .first()
            .waitFor({
                state: 'visible',
                timeout:
                    typeof waitForVisible === 'number'
                        ? waitForVisible
                        : globalSettings.assertElementsHidden.defaultWaitForVisibleTimeout,
            })
            .catch(() => {});
    }

    const itemsCount = await locator.count();

    for (let i = 0; i < itemsCount; i++) {
        await expect(locator.nth(i)).toBeHidden();
    }
}
