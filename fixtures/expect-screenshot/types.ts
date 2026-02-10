import type { Locator, Page } from '@playwright/test';

import type { MatchScreenshotOptions, ScreenshotOptions } from '../../actions/matchScreenshot';

export type DefaultScreenshotOptions = Omit<ScreenshotOptions, 'mask'>;
export type ExpectScreenshotOptions = MatchScreenshotOptions & {
    shouldUseDefaultMask?: boolean;
};

export type ExpectScreenshotFixtureBuilderParams = Pick<
    MatchScreenshotOptions,
    | 'hideBySelector'
    | 'pause'
    | 'soft'
    | 'shouldPrependSlugToName'
    | 'themes'
    | 'onBeforeScreenshot'
    | 'onSwitchTheme'
> & {
    screenshotOptions?: DefaultScreenshotOptions;
    getDefaultMask?: (page: Page) => Locator[];
    getDefaultLocator?: (page: Page) => Locator | Page;
};

export type ExpectScreenshotFn = (params?: ExpectScreenshotOptions) => Promise<void>;

export type ExpectScreenshotTestArgs = {
    expectScreenshot: ExpectScreenshotFn;
};
export type ExpectScreenshotTestOptions = {};

export type ExpectScreenshotWorkerArgs = {};
export type ExpectScreenshotWorkerOptions = {};

export type ExpectScreenshotTestFixtures = ExpectScreenshotTestArgs & ExpectScreenshotTestOptions;
export type ExpectScreenshotWorkerFixtures = ExpectScreenshotWorkerArgs &
    ExpectScreenshotWorkerOptions;

export type ExpectScreenshotFixtures = ExpectScreenshotTestFixtures &
    ExpectScreenshotWorkerFixtures;
