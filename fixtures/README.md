# Fixtures

## expectRequest

Allows checking whether a request was made to an endpoint with specified parameters.

Extend `test` in Playwright:

```ts
import { expectRequest, type ExpectRequestFn } from 'playwright-tools/fixtures';

export type TestExtraFixtures = {
    expectRequest: ExpectRequestFn;
};

export const test = baseTest.extend<TestExtraFixtures, WorkerExtraFixtures>({
    expectRequest,
});
```

Usage in test:

```ts
test('Some random test', async ({ page, expectRequest }) => {
    ...

    await expectRequest(
        '**/some/cool/endpoint',
        {
            method: 'POST',
            query: { foo: 'bar' },
            body: {
                param1: 'value1',
                param2: { param3: 'value3' },
            },
        },
        {
            timeout: 10000,
            exact: true,
        },
    );
});
```

For details on how it works and parameter descriptions, see the action [expectRequest](../actions/README.md#expectrequest).

## expectScreenshot

Allows performing checks using screenshots

Extend `test` in Playwright:

```ts
import { expectScreenshotFixtureBuilder, type ExpectScreenshotFn } from 'playwright-tools/fixtures';

const expectScreenshot = expectScreenshotFixtureBuilder({
    screenshotOptions: {
        animations: 'disabled',
    },
    soft: true,

    themes: ['dark', 'light'],
})

export type TestExtraFixtures = {
    expectScreenshot: ExpectScreenshotFn;
};

export const test = baseTest.extend<TestExtraFixtures, WorkerExtraFixtures>({
    expectScreenshot,
})
```

Usage in test:

```ts
test('Some random test', async ({ page, expectScreenshot }) => {
    ...

    await expectScreenshot();
});
```

For details on how it works and parameter descriptions, see the action [matchScreenshot](../actions/README.md#matchScreenshot).

Additional `expectScreenshot` parameters:

```ts

type ExpectScreenshotParams = MatchScreenshotParams & {
    /**
     * Whether to use default mask when taking screenshot
     * The mask itself is taken from the `getDefaultMask` callback
     * @default true
     */
    shouldUseDefaultMask?: boolean;
}
```

`expectScreenshotFixtureBuilder` parameters: 

```ts
type ExpectScreenshotFixtureBuilderParams = {
    /**
     * Screenshot creation and comparison parameters (parameters for `toHaveScreenshot` call)
     */
    screenshotOptions?: ScreenshotOptions;
    /**
     * CSS selectors (pure CSS only) of elements to hide
     */
    hideBySelector?: string[];
    /**
     * Pause before screenshot (ms)
     * @defaultValue `1000`
     */
    pause?: number;
    /**
     * Use soft assertion
     * @defaultValue `true`
     */
    soft?: boolean;
    /**
     * Whether to prepend slug to screenshot file name
     * @default true
     */
    shouldPrependSlugToName?: boolean;
    /**
     * Themes for which screenshots should be taken
     * By default, screenshots are taken for the current theme. No switching occurs
     */
    themes?: Theme[];
    /**
     * Callback before taking screenshot. Useful for special stabilizing actions
     * @param page Page current page
     */
    onBeforeScreenshot?: (page: Page) => Promise<void>;
    /**
     * Callback for switching theme on page before taking screenshot
     * By default, switches theme using `page.emulateMedia({ colorScheme: theme });`
     * @param theme Theme Theme for which screenshot will be taken
     * @param page Page current page
     */
    onSwitchTheme?: (theme: Theme, page: Page) => Promise<void>;
    /**
     * Callback to get default mask. This mask will hide elements before test 
     * The mask will be applied if no other mask is passed to the test
     * @param page Page current page
     * 
     * @returns Locator[] list of locators to hide
     */
    getDefaultMask?: (page: Page) => Locator[];
};
```

## mockNetwork

Simplifies mock data setup for integration tests.
When the fixture is enabled, all requests matching the passed regular expression will be recorded to .har and replayed on subsequent test runs

Extend `test` in Playwright:

```ts
import { mockNetworkFixtureBuilder } from 'playwright-tools/fixtures';

export type TestExtraFixtures = {
    isNetworkMocked: boolean;
};

// Flag indicating whether requests are currently being recorded or read, must be passed externally. The name UPDATE_DUMPS is chosen as an example
const NEED_TO_UPDATE = process.env.UPDATE_DUMPS;

const mockNetwork = mockNetworkFixtureBuilder({
    shouldUpdate: NEED_TO_UPDATE,
    forceUpdateIfHarMissing: !process.env.CI,

    url: (baseURL) => {
        const url = baseURL.replace(/\/+$/, '');

        return new RegExp(
            `^${escapeStringRegExp(url)}/(gateway|_/node|_/serverless|_/ydb-document-proxy)/`,
            'i',
        );
    },
    zip: true,

    headersToRemove: ['set-cookie'],
});

export const test = baseTest.extend<TestExtraFixtures, WorkerExtraFixtures>({
    isNetworkMocked: mockNetwork,
});
```

Now tests will run on recorded data. In the tests themselves, you can get the flag indicating whether the network is mocked as follows:

```ts
test('Some random test', async ({ page, isNetworkMocked }) => {
    // isNetworkMocked === true
});
```

`mockNetworkFixtureBuilder` parameters:

```ts
type MockNetworkFixtureBuilderParams = {
    /**
     * Whether to update dumps
     * @defaultValue `false`
     */
    shouldUpdate: boolean;

    /**
     * Always update dumps if they're missing
     * @defaultValue `false`
     */
    forceUpdateIfHarMissing?: boolean;

    /**
     * Custom timeout for test updates. Milliseconds.
     * Useful for long updates
     */
    updateTimeout?: number;

    /**
     * Archive dumps
     * @defaultValue true
     */
    zip?: boolean;

    /**
     * Request URL pattern to be recorded to .har. Non-matching requests will be skipped.
     * @param baseURL string Base page URL.
     * @returns string | RegExp Prepared pattern; Glob or RegExp.
     */
    url: (baseURL: string) => string | RegExp;

    /**
     * Custom path to dumps file. Overrides the path formed through dumpsPath.
     * @param params Parameters for building the path:
     * @param params.testInfo TestInfo information about current test
     * @param params.zip Flag for using zip archive for .har
     *
     * @returns string path to dumps file
     */
    dumpsFilePath?: (params: { testInfo: TestInfo; zip: boolean }) => string;

    /**
     * Additional headers to be removed before recording request to .har
     * By default, the following headers are removed: `cookie`, `x-csrf-token`, `content-security-policy`, `Session_id`
     */
    headersToRemove?: string[];

    /**
     * Additional set-cookie values for which set-cookie headers will be removed
     * By default, set-cookie is removed for the following values: `CSRF-TOKEN`
     */
    setCookieToRemove?: string[];

    /**
     * Callback for processing requests and responses before saving to .har. Useful for various post-processing: cleaning, format changes, etc.
     * By default, sensitive headers are removed + request base URL is changed to a stub
     * @param entry Entry in .har to be recorded
     */
    onHarEntryWillWrite?: (entry: Entry) => void;

    /**
     * Callback for processing requests and responses recorded in .har before they're used
     * Useful for reverting changes made in onHarEntryWillWrite
     * By default, base URL stubs are replaced with actual test baseUrl
     * @param entry Entry in .har to be used
     */
    onHarEntryWillRead?: (entry: Entry) => void;

    /**
     * Callback for changing .har request search parameters
     */
    onTransformHarLookupParams?: HarLookupParamsTransformFunction;

    /**
     * Callback for transforming .har request search result
     */
    onTransformHarLookupResult?: HarLookupResultTransformFunction;
};
```

## globalSettings

Fixture for managing playwright-tools global settings. Allows configuring global defaults and gives the ability to manage them from tests

Extend `test` in Playwright:

```ts
import type { GlobalSettingsTestArgs, GlobalSettingsWorkerArgs, } from 'playwright-tools/fixtures';
import { globalSettingsFixturesBuilder } from 'playwright-tools/fixtures';

export type TestExtraFixtures = GlobalSettingsTestArgs;
export type WorkerExtraFixtures = GlobalSettingsWorkerArgs;

const globalSettingsFixtures = globalSettingsFixturesBuilder({
    globalSettings: {
        matchScreenshot: {
            pause: 1500, // 1500 ms pause before taking screenshot
        },    
    }
});

export const test = baseTest.extend<TestExtraFixtures, WorkerExtraFixtures>({
    ...globalSettingsFixtures
});
```

Now when the worker starts, the defaults above will be applied. Also in tests and other fixtures we have the ability to manage global settings:

```ts
test('Some test', async ({ getGlobalSettings, setGlobalSettings }) => {
    // test code here
});
```

## testSlug

Automatically sets and adds to test fixtures the current slug value for the test.
Uses `setTestSlug` and `getTestSlug` internally.

Extend `test` in Playwright:

```ts
import type { TestSlugResult } from 'playwright-tools/fixtures';
import { testSlug } from 'playwright-tools/fixtures';

export type TestExtraFixtures = {
    testSlug: TestSlugResult;
};

export const test = baseTest.extend<TestExtraFixtures, WorkerExtraFixtures>({
    testSlug,
});
```

Now in tests and other fixtures we have access to the `testSlug` value:

```ts
test('Some my test [test-slug]', async ({ page, testSlug }) => {
    // testSlug === 'test-slug'
});
```

## mount

Enhanced mount fixture for Playwright Component Testing that wraps React components with a styled container for better test consistency and visual testing.

Extend `test` in Playwright:

```ts
import { mountFixture, type MountFn, TEST_WRAPPER_CLASS } from 'playwright-tools/fixtures';

export type TestExtraFixtures = {
    mount: MountFn;
};

export const test = baseTest.extend<TestExtraFixtures, WorkerExtraFixtures>({
    mount: mountFixture,
});
```

Usage in test:

```ts
import { MyButton } from './MyButton';

test('renders button correctly', async ({ mount }) => {
    const component = await mount(
        <MyButton label="Click me" />,
        {
            width: 300,
            rootStyle: { 
                backgroundColor: '#f0f0f0',
            },
        }
    );

    await expect(component).toBeVisible();
});
```

### Features

The mount fixture enhances the base Playwright mount function with:

1. **Wrapper Container**: Wraps components in a styled div with 20px padding for better screenshots
2. **Flexible Sizing**: Uses `fit-content` by default, or accepts custom width
3. **Button Stability**: Prevents button scale animations during clicks to ensure consistent positioning
4. **Identifiable Class**: Adds `TEST_WRAPPER_CLASS` (`playwright-wrapper-test`) to the wrapper for easy targeting

### Mount Options

Extends standard Playwright mount options with:

```ts
type MountFn = <HooksConfig>(
    component: React.JSX.Element,
    options?: MountOptions<HooksConfig> & {
        /**
         * Width of the wrapper container
         * When set, uses content-box sizing so padding doesn't affect the specified width
         * @example 300 or '300px'
         */
        width?: number | string;
        
        /**
         * Additional CSS styles to apply to the wrapper container
         * Merged with default styles (padding: 20, width: 'fit-content', height: 'fit-content')
         */
        rootStyle?: React.CSSProperties;
    },
) => Promise<MountResult>;
```

### Exported Constants

- `TEST_WRAPPER_CLASS` - The CSS class name applied to the wrapper div (`'playwright-wrapper-test'`)

