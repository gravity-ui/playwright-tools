import type { Locator } from '@playwright/test';
import { expect } from '@playwright/test';

import { globalSettings } from '../data/globalSettings';

/**
 * Доживается скрытия всех элементов, подходящих под локатор
 *
 * Опционально проверяет, что элемент сначала был видимым (дождаться появления).
 * Если элемент не стал видим по прошествии таймаута (300 мс по-умолчанию),
 * то считается что он успел скрыться до этого, ошибку это не вызывает.
 *
 * @param locator Локатор элементов, которые должны скрыться
 * @param waitForVisible Включить проверку, что изначально присутствует
 *  (при `true` — с таймаутом по-умолчанию, при числе — с заданным)
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
