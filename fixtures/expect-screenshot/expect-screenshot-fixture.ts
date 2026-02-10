import type {
    Fixtures,
    PlaywrightTestArgs,
    PlaywrightTestOptions,
    PlaywrightWorkerArgs,
    PlaywrightWorkerOptions,
    TestFixture,
} from '@playwright/test';

import { matchScreenshot } from '../../actions/matchScreenshot';

import type {
    ExpectScreenshotFixtureBuilderParams,
    ExpectScreenshotFn,
    ExpectScreenshotTestFixtures,
    ExpectScreenshotWorkerFixtures,
} from './types';

export function expectScreenshotFixturesBuilder({
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

    const fixtures: Fixtures<
        ExpectScreenshotTestFixtures,
        ExpectScreenshotWorkerFixtures,
        PlaywrightTestArgs & PlaywrightTestOptions,
        PlaywrightWorkerArgs & PlaywrightWorkerOptions
    > = {
        expectScreenshot: [expectScreenshotFixture, { scope: 'test' }],
    };

    return fixtures;
}
