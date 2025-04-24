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
};

export type ExpectScreenshotFn = (params?: ExpectScreenshotOptions) => Promise<void>;

export type ExpectScreenshotTestArgs = {
    expectScreenshot: ExpectScreenshotFn;
};
