# Fixtures

## expectRequest

Allows checking whether a request was made to an endpoint with specified parameters.

Extend `test` in Playwright:

```ts
import type {
    ExpectRequestTestFixtures,
    ExpectRequestWorkerFixtures,
} from 'playwright-tools/fixtures';
import { expectRequestFixturesBuilder } from 'playwright-tools/fixtures';

export type TestExtraFixtures = ExpectRequestTestFixtures;
export type WorkerExtraFixtures = ExpectRequestWorkerFixtures;

const expectRequestFixtures = expectRequestFixturesBuilder();

export const test = baseTest.extend<TestExtraFixtures, WorkerExtraFixtures>({
    ...expectRequestFixtures,
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
import type {
    ExpectScreenshotTestFixtures,
    ExpectScreenshotWorkerFixtures
} from 'playwright-tools/fixtures';
import { expectScreenshotFixturesBuilder } from 'playwright-tools/fixtures';

export type TestExtraFixtures = ExpectScreenshotTestFixtures;
export type WorkerExtraFixtures = ExpectScreenshotWorkerFixtures;

const expectScreenshotFixtures = expectScreenshotFixturesBuilder({
    screenshotOptions: {
        animations: 'disabled',
    },
    soft: true,

    themes: ['dark', 'light'],
});

export const test = baseTest.extend<TestExtraFixtures, WorkerExtraFixtures>({
    ...expectScreenshotFixtures,
});
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

type ExpectScreenshotOptions = MatchScreenshotOptions & {
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
    screenshotOptions?: Omit<ScreenshotOptions, 'mask'>;
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
     * @default false
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
    onBeforeScreenshot?: (page: Page, options: ScreenshotOptions) => Promise<void>;
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
    /**
     * Callback to get default locator for screenshots.
     * Useful for component testing to default to the mounted component wrapper
     * instead of the full page.
     * If not provided, full page screenshot will be used.
     * @param page Page current page
     *
     * @returns Locator | Page default locator to use for screenshots
     */
    getDefaultLocator?: (page: Page) => Locator | Page;
};
```

## mockNetwork

Simplifies mock data setup for integration tests.
When the fixture is enabled, all requests matching the passed regular expression will be recorded to .har and replayed on subsequent test runs

Extend `test` in Playwright:

```ts
import type {
    MockNetworkTestFixtures,
    MockNetworkWorkerFixtures,
} from 'playwright-tools/fixtures';
import { mockNetworkFixturesBuilder } from 'playwright-tools/fixtures';

export type TestExtraFixtures = MockNetworkTestFixtures;
export type WorkerExtraFixtures = MockNetworkWorkerFixtures;

// Flag indicating whether requests are currently being recorded or read, must be passed externally. The name UPDATE_DUMPS is chosen as an example
const NEED_TO_UPDATE = process.env.UPDATE_DUMPS;

const mockNetworkFixtures = mockNetworkFixturesBuilder({
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
    ...mockNetworkFixtures,
});
```

The fixture provides two values:
- `enableNetworkMocking`: A boolean option that can be configured per project to enable/disable network mocking. Defaults to `true`.
- `isMockingEnabled`: A boolean indicating whether mocking is currently active (depends on `enableNetworkMocking` value).

You can configure `enableNetworkMocking` per project in your Playwright config:

```ts
export default defineConfig({
    projects: [
        {
            name: 'with-mocking',
            use: {
                enableNetworkMocking: true,
            },
        },
        {
            name: 'without-mocking',
            use: {
                enableNetworkMocking: false,
            },
        },
    ],
});
```

Usage in test:

```ts
test('Some random test', async ({ page, isMockingEnabled }) => {
    // isMockingEnabled === true (when enableNetworkMocking is true)
});
```

`mockNetworkFixturesBuilder` parameters:

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
     * @param baseURL The base URL of the test
     */
    onHarEntryWillWrite?: (entry: Entry, baseURL: string) => void;

    /**
     * Callback for processing requests and responses recorded in .har before they're used
     * Useful for reverting changes made in onHarEntryWillWrite
     * By default, base URL stubs are replaced with actual test baseUrl
     * @param entry Entry in .har to be used
     * @param baseURL The base URL of the test
     */
    onHarEntryWillRead?: (entry: Entry, baseURL: string) => void;

    /**
     * Callback for changing .har request search parameters
     * @param params The lookup parameters
     * @param baseURL The base URL of the test
     */
    onTransformHarLookupParams?: (
        params: Parameters<HarLookupParamsTransformFunction>[0],
        baseURL: string,
    ) => ReturnType<HarLookupParamsTransformFunction>;

    /**
     * Callback for transforming .har request search result
     * @param result The lookup result
     * @param params The lookup parameters
     * @param baseURL The base URL of the test
     */
    onTransformHarLookupResult?: (
        result: Parameters<HarLookupResultTransformFunction>[0],
        params: Parameters<HarLookupResultTransformFunction>[1],
        baseURL: string,
    ) => ReturnType<HarLookupResultTransformFunction>;

    /**
     * Flag to enable or disable adding the x-tests-duplicate-id header for identical requests
     * By default, the header is not added
     * @defaultValue `false`
     */
    shouldMarkIdenticalRequests?: boolean;
};
```

## globalSettings

Fixture for managing playwright-tools global settings. Allows configuring global defaults and gives the ability to manage them from tests

Extend `test` in Playwright:

```ts
import type { GlobalSettingsTestFixtures, GlobalSettingsWorkerFixtures, } from 'playwright-tools/fixtures';
import { globalSettingsFixturesBuilder } from 'playwright-tools/fixtures';

export type TestExtraFixtures = GlobalSettingsTestFixtures;
export type WorkerExtraFixtures = GlobalSettingsWorkerFixtures;

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
import type {
    TestSlugTestFixtures,
    TestSlugWorkerFixtures,
} from 'playwright-tools/fixtures';
import { testSlugFixturesBuilder } from 'playwright-tools/fixtures';

export type TestExtraFixtures = TestSlugTestFixtures;
export type WorkerExtraFixtures = TestSlugWorkerFixtures;

const testSlugFixtures = testSlugFixturesBuilder();

export const test = baseTest.extend<TestExtraFixtures, WorkerExtraFixtures>({
    ...testSlugFixtures,
});
```

Usage in test:

```ts
test('Some my test [test-slug]', async ({ page, testSlug }) => {
    // testSlug === 'test-slug'
});
```

