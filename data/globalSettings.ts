import type { Page } from '@playwright/test';

import type { Config } from '../actions/collectPageActivity';
import {
    defaultIgnoredMessageTypes,
    defaultIgnoredResponseStatuses,
} from '../actions/collectPageActivity/constants';
import type {
    OnBeforeScreenshotCallback,
    OnSwitchThemeCallback,
    ScreenshotOptions,
    Theme,
} from '../actions/matchScreenshot';

const collectPageActivity: Pick<
    Required<Config>,
    | 'ignoredMessageTypes'
    | 'expectedMessages'
    | 'ignoredResponseStatuses'
    | 'expectedResponses'
    | 'requestIdHeader'
> = {
    ignoredMessageTypes: defaultIgnoredMessageTypes,
    expectedMessages: [
        {
            type: 'error',
            text: /^Failed to load resource: the server responded with a status of/,
        },
    ],
    ignoredResponseStatuses: defaultIgnoredResponseStatuses,
    expectedResponses: [],
    requestIdHeader: 'x-request-id',
};

/**
 * Global settings for commands
 */
export const globalSettings = {
    /**
     * actions/assertElementsHidden
     */
    assertElementsHidden: {
        defaultWaitForVisibleTimeout: 300,
    },
    /**
     * actions/matchScreenshot
     */
    matchScreenshot: {
        /**
         * Screenshot creation and comparison parameters.
         * Will be merged with those passed during the call.
         */
        options: {} as ScreenshotOptions,
        /**
         * CSS selectors (pure CSS) of elements to hide.
         * Will be merged with those passed in the call.
         */
        hideBySelector: undefined as string[] | undefined,
        /**
         * Pause before screenshot (ms)
         */
        pause: 1000,
        /**
         * Use soft assertion
         */
        soft: true,
        /**
         * Default screenshot name
         */
        name: 'plain' as string | undefined,
        /**
         * Should I add a slug to the screenshot file name?
         */
        shouldPrependSlugToName: true,
        /**
         * Topics that require a screenshot
         * By default, screenshots are taken for the current theme. Switching does not occur
         */
        themes: undefined as Theme[] | undefined,
        /**
         * Callback before taking a screenshot. Useful for any special stabilizing actions
         * @param page Page Current page
         */
        onBeforeScreenshot: undefined as OnBeforeScreenshotCallback | undefined,
        /**
         * Callback to switch theme to pages before taking screenshot
         * By default, switches the theme using `page.emulateMedia({ colorScheme: theme });`
         * @param theme Theme The theme for which the screenshot will be taken
         * @param page Page Current page
         */
        onSwitchTheme: (async (theme: Theme, page: Page) => {
            await page.emulateMedia({ colorScheme: theme });
        }) as undefined | OnSwitchThemeCallback,
    },
    /**
     * utils/waitForResolve
     */
    waitForResolve: {
        /**
         * Interval between checks (ms)
         */
        interval: 100,
        /**
         * Timeout after which checks are aborted (ms)
         * `0` — without timeout
         */
        timeout: 5000,
    },

    collectPageActivity,

    waitForNetworkSettled: {
        /** Timeout time after request */
        delay: 0,
    },
} satisfies Record<string, object>;

type GlobalSettingsType = typeof globalSettings;

export interface GlobalSettings extends GlobalSettingsType {}
export type PartialGlobalSettings = {
    [Key in keyof GlobalSettings]?: Partial<GlobalSettings[Key]>;
};
