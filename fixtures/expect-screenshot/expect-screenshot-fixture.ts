import type { PlaywrightTestArgs, PlaywrightTestOptions, TestFixture } from '@playwright/test';

import { matchScreenshot } from '../../actions/matchScreenshot';

import type { ExpectScreenshotFixtureBuilderParams, ExpectScreenshotFn } from './types';

export function expectScreenshotFixtureBuilder({
    screenshotOptions,
    getDefaultMask,
    getDefaultLocator,

    ...restDefaults
}: ExpectScreenshotFixtureBuilderParams = {}) {
    const expectScreenshotFixture: TestFixture<
        ExpectScreenshotFn,
        PlaywrightTestArgs & PlaywrightTestOptions
    > = async ({ page }, use) => {
        const expectScreenshot: ExpectScreenshotFn = ({
            options = {},
            shouldUseDefaultMask = true,
            locator,
            ...restParams
        } = {}) => {
            const { mask = [] } = options;

            const defaultMask = shouldUseDefaultMask && getDefaultMask ? getDefaultMask(page) : [];
            const maskToUse = [...mask, ...defaultMask];

            const locatorToUse = locator ?? getDefaultLocator?.(page);

            const mergedOptions = {
                options: { ...screenshotOptions, ...options, mask: maskToUse },
                locator: locatorToUse,
                ...restDefaults,
                ...restParams,
            };

            return matchScreenshot(page, mergedOptions);
        };

        await use(expectScreenshot);
    };

    const fixtureOptions = {
        scope: 'test' as const,
    };

    const expectScreenshot: [typeof expectScreenshotFixture, typeof fixtureOptions] = [
        expectScreenshotFixture,
        fixtureOptions,
    ];

    return expectScreenshot;
}
