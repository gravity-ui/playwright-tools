# Browser Actions

## assertElementsHidden

Waits for all elements matching the locator to be hidden.

Optionally checks that the element was initially visible (waits for it to appear). If the element doesn't become visible after the timeout (300 ms by default), it's assumed to have been hidden before that, which doesn't cause an error.

Parameters:

- `locator: Locator` — Locator of elements that should be hidden
- `waitForVisible?: boolean | number = false` — Enable checking that the element is initially present (with default timeout if `true`, with specified timeout if a number)

## disableAnimations

Disables CSS animations by setting 1 ms duration on all elements and disabling delays and iterations.

Parameters:

- `page: Page` — Page object where styles will be created.
- `allowFor?: string[]` — CSS selectors of elements that should keep animations enabled.

## disableMetrika

Disables selected Yandex Metrika counters using the standard API.

This function prevents Yandex Metrika counters from initializing by setting the appropriate disable flags before page scripts execute.

Parameters:

- `page: Page` — Page object where the script will be injected.
- `counters: number[]` — Array of Metrika counter IDs to disable.

Example:

```ts
await disableMetrika(page, { counters: [12345678, 87654321] });
```

See [Yandex Metrika documentation](https://yandex.ru/support/metrica/general/user-opt-out.html) for more information.

## getTestSlug

Returns the test slug identifier. A slug is a short, file-name-safe alternative test name that's used at the end of the test name in square brackets:

```ts
test('My test title [my-test]', () => {})
```

Here `slug === 'my-test'`.

The slug is stored per project. It's expected to be set in your test initialization (similar to `initTest`) using the `setTestSlug` function.

If the test doesn't have a slug specified in square brackets, the title itself will be used. See [`extractTestSlug`](../utils/README.md#extractTestSlug).

## setTestSlug

Sets the test slug identifier.

Parameters:

- `page: Page` — Page object for which the slug will be saved.
- `title: string` — Test title from which the slug will be extracted.
- `required: boolean = false` — Requires the slug to be specified in a special way in the title (otherwise the title itself will be used).

It's convenient to call this in your test initialization:

```ts
setTestSlug(page, testInfo.title)
```

## matchScreenshot

Performs a screenshot comparison with a slug-based prefix in the name.  
Direct calls to `toHaveScreenshot` save screenshots to the common screenshot directory for the test file. The `matchScreenshot` function creates a subdirectory for the test using its slug. This makes screenshots easier to manage and maintain, as it's immediately clear which test they belong to.

The function uses `getTestSlug`.

It also has some other built-in tools.

By default, screenshots are checked as soft assertions so that in addition to the failed visual comparison, you get additional information about test discrepancies. But this behavior can be changed by setting the `soft` parameter to `false`.

Multiple theme screenshots are supported: light, dark

Accepts an object with parameters:

```ts
type MatchScreenshotOptions = {
    /**
     * Element to screenshot, or page
     * @defaultValue `page`
     */
    locator?: Locator | Page;
    /**
     * Screenshot name in the test, can be omitted for a single screenshot
     * @defaultValue globalSettings.matchScreenshot.name
     */
    name?: string;
    /**
     * Screenshot creation and comparison options (parameters for `toHaveScreenshot` call)
     * @defaultValue globalSettings.matchScreenshot.options
     */
    options?: ScreenshotOptions;
    /**
     * CSS selectors (pure CSS only) of elements to hide
     * @defaultValue globalSettings.matchScreenshot.hideBySelector
     */
    hideBySelector?: string[];
    /**
     * Pause before screenshot (ms)
     * @defaultValue globalSettings.matchScreenshot.pause
     */
    pause?: number;
    /**
     * Use soft assertion
     * @defaultValue globalSettings.matchScreenshot.soft
     */
    soft?: boolean;
    /**
     * Move mouse cursor to specified coordinates (to avoid unwanted hover in screenshot)
     */
    moveMouse?: { x: number; y: number } | [x: number, y: number] | number;
    /**
     * Whether to prepend slug to screenshot file name
     * @defaultValue globalSettings.matchScreenshot.shouldPrependSlugToName
     */
    shouldPrependSlugToName?: boolean;
    /**
     * Themes for which screenshots should be taken
     * By default, screenshots are taken for the current theme. No switching occurs
     * @defaultValue globalSettings.matchScreenshot.themes
     */
    themes?: Theme[];
    /**
     * Callback before taking screenshot. Useful for special stabilizing actions.
     * Called before each individual screenshot (including each theme when multiple themes are configured).
     * @param page Page current page
     * @param options ScreenshotOptions screenshot options being used
     * @defaultValue globalSettings.matchScreenshot.onBeforeScreenshot
     */
    onBeforeScreenshot?: (page: Page, options: ScreenshotOptions) => Promise<void>;
    /**
     * Callback for switching theme on the page before taking screenshot
     * By default, switches theme using `page.emulateMedia({ colorScheme: theme });`
     * @param theme Theme Theme for which screenshot will be taken
     * @param page Page current page
     * @defaultValue globalSettings.matchScreenshot.onSwitchTheme
     */
    onSwitchTheme?: (theme: Theme, page: Page) => Promise<void>;
};
```

## expectRequest

Allows checking whether a request was made to an endpoint with specified parameters.

```ts

const requests = new Map<string, Request>

...

await expectRequest(
    requests,
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
)
```

Supports checking request method, query parameters, and body.

Two validation modes are supported for query parameters and body:

- exact match (deepEqual): if the request contains all expected parameters AND some additional ones, the check will **fail**
- partial match: if the request contains all expected parameters AND some additional ones, the check will **pass**

Parameters:

- `requests: Map<string, Request>`: collection of requests sent during test execution. Can be collected by subscribing to the page event `page.on('request, (data) => {...})`. **IMPORTANT**: expected format of keys in `requests`: `${url.protocol}//${url.hostname}${url.pathname}`. Behavior is not guaranteed if this format is not followed
- `url: string | RegExp`: url where request is expected. Supports globs and regular expressions
- `matcher`: predicates for comparing request parameters. If a predicate is not specified, the request is considered matching.
    - `matcher.method: HttpMethod`: acceptable HTTP method
    - `matcher.query: string | Record<string, string | string[]>`: request query parameters. Supports passing as a qs-string (`?foo=bar&fizz=bazz`) or as a collection
    - `matcher.body: Json`: request body as JSON
- `options`: asserter settings
    - `options.timeout: number`: assertion timeout
    - `options.exact: boolean`: validation mode. When enabled, query parameters and request body will be checked for exact match

## collectPageActivity

Utility to ensure there are no errors in network requests and console on the page. Returns a method to unsubscribe the page from handlers and results of page observation.

```ts
const baseUrl = 'https://test.com';

// Start monitoring activity
const {results, unsubscribe} = await collectPageActivity(page, {
    baseUrl,
    // Expect that some console logging is normal on the page
    expectedMessages: ['log']
});

// Wait for the page to stop creating requests
await waitForNetworkSettled(page, () => page.goto(baseUrl));

// Remove handlers from the page
unsubscribe();

// Check that observation results contain nothing unexpected
expect(results).toEqual({
    uncaughtErrors: [],
    pageCrashes: [],
    unexpectedMessages: [],
    failedResponses: [],
});
```

You can control what should be considered a failure through options

Parameters:

- `baseUrl`: string, __required argument__ with a link to the stand being asserted, used to construct URLs
- `ignoredMessageTypes`: array of console request types that should be ignored, see ConsoleMessage.type
    - Default: `globalSettings.collectPageActivity.ignoredMessageTypes`
- `expectedMessages`: array of console messages that are considered expected, each object contains:
    - `type`: message type, see ConsoleMessage.type
    - `text`: string or regular expression to compare with console message text
    - Default: `globalSettings.collectPageActivity.expectedMessages`
- `ignoredResponseStatuses`: array of numbers, response codes that are ignored and not considered problematic
    - Default: `globalSettings.collectPageActivity.ignoredResponseStatuses`
- `expectedResponses`: array of objects, allows listing server responses that won't be added to final results, each object must contain:
    - `status`: number, response status
    - `url`: string with absolute URL, will be joined with `baseUrl` for comparison
    - Default: `globalSettings.collectPageActivity.expectedResponses`
- `requestIdHeader`: string, name of the header containing the request identifier
    - Default: `globalSettings.collectPageActivity.requestIdHeader` (defaults to `'x-request-id'`)

## waitForNetworkSettled

Utility to check completion of all requests after executing the passed action.

```ts
await waitForNetworkSettled(page, async () => {
    await page.getByRole('link', {name: 'Foobar'});
});
```

You can pass an object with options as the third argument.

Parameters:

- `networkSettleDelay`: delay that will be set after each request completing on the page.
    - Default: `globalSettings.waitForNetworkSettled.delay` (defaults to `0`)

## Setting Additional Headers

The built-in `setExtraHTTPHeaders` command available in `Page` and `BrowserContext` only allows setting the entire list of additional headers at once. If you need to set headers not all at once but in different places in code, it's not suitable, as it doesn't even provide a way to get the current list of already set headers. You can only reassign the entire list, you can't add a new item.

Several commands have been added that manage an internally stored list of headers. Headers are stored per browser context and set on it. The context is unique to each test but shared across all pages (`Page`) in that test.

All commands only work with their own internal list of headers, and when modified, set them on browserContext through `setExtraHTTPHeaders`.

**Common parameters:**

- `browserContext: BrowserContext` — Browser context, can be obtained through `page.context()`.
- `headerName: string` — Header name.
- `headerValue: string` — Value to write for the specified header.
- `additionalHeaders: Record<string, string>` — List of headers to add.

Header name is always converted to lowercase.

### addExtraHttpHeader

Adds header `headerName` with value `headerValue` to the additional headers list.

```ts
async function addExtraHttpHeader(
    browserContext: BrowserContext,
    headerName: string,
    headerValue: string,
): Promise<void>
```

### addExtraHttpHeaders

Allows adding multiple headers to the additional headers list at once.

```ts
async function addExtraHttpHeaders(
    browserContext: BrowserContext,
    additionalHeaders: Record<string, string>,
): Promise<void>
```

### hasExtraHttpHeader

Allows checking whether a header is already added to the additional headers list.

Only checks the internal list for these commands.

```ts
function hasExtraHttpHeader(
    browserContext: BrowserContext, 
    headerName: string
): boolean
```

### getExtraHttpHeader

Returns the header value from the additional headers list, if it exists.

```ts
function getExtraHttpHeader(
    browserContext: BrowserContext, 
    headerName: string
): string | undefined
```

### getExtraHttpHeaders

Returns the list of all headers from the additional headers list.

```ts
function getExtraHttpHeaders(
    browserContext: BrowserContext
): Record<string, string>
```

### removeExtraHttpHeader

Removes a header from the additional headers list.

```ts
async function removeExtraHttpHeader(
    browserContext: BrowserContext,
    headerName: string,
): Promise<void>
```

### clearExtraHttpHeaders

Clears the additional headers list.

```ts
async function clearExtraHttpHeaders(
    browserContext: BrowserContext
): Promise<void>
```

## Managing Global Settings

Global settings allow changing the default behavior for functions from the playwright-tools package.

Global settings are an object where the key is a settings section (usually corresponding to a command), and the value is an object with settings for that section.

When reassigning settings, sections are merged, settings per section are also merged, but shallowly - the value inside the section settings is considered newly set.

### What can be changed through global settings

```ts
{
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
         * Will be merged with those passed on call.
         */
        options: {} as ScreenshotOptions,
        /**
         * CSS selectors (pure CSS only) of elements to hide.
         * Will be merged with those passed on call.
         */
        hideBySelector: undefined as string[] | undefined,
        /**
         * Pause before each screenshot (ms).
         * Applied per individual screenshot capture (including each theme).
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
         * Whether to prepend slug to screenshot file name
         */
        shouldPrependSlugToName: true,
        /**
         * Themes for which screenshots should be taken
         * By default, screenshots are taken for the current theme. No switching occurs
         */
        themes: undefined as Theme[] | undefined,
        /**
         * Callback before taking screenshot. Useful for special stabilizing actions.
         * Called before each individual screenshot (including each theme).
         */
        onBeforeScreenshot: undefined as OnBeforeScreenshotCallback | undefined,
        /**
         * Callback for switching theme on page before taking screenshot
         * By default, switches theme using `page.emulateMedia({ colorScheme: theme });`
         */
        onSwitchTheme: async (theme: Theme, page: Page) => {
            await page.emulateMedia({ colorScheme: theme });
        },
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
         * Timeout after which checks are interrupted (ms)
         * `0` — no limit
         */
        timeout: 5000,
    },
    /**
     * actions/collectPageActivity
     */
    collectPageActivity: {
        /**
         * Console message types to ignore
         */
        ignoredMessageTypes: [
            'dir',
            'dirxml',
            'table',
            'clear',
            'startGroup',
            'startGroupCollapsed',
            'endGroup',
            'profile',
            'profileEnd',
            'count',
            'timeEnd',
        ],
        /**
         * Expected console messages (won't be added to results)
         * Array of objects with:
         * - type: message type (see ConsoleMessage.type)
         * - text: string or RegExp to match against message text
         */
        expectedMessages: [
            {
                type: 'error',
                text: /^Failed to load resource: the server responded with a status of/,
            },
        ],
        /**
         * Response status codes to ignore (won't be added to results)
         */
        ignoredResponseStatuses: [200],
        /**
         * Expected responses (won't be added to results)
         * Array of objects with:
         * - status: response status code
         * - url: absolute URL (will be joined with baseUrl)
         */
        expectedResponses: [],
        /**
         * Header name containing request identifier
         */
        requestIdHeader: 'x-request-id',
    },
    /**
     * actions/waitForNetworkSettled
     */
    waitForNetworkSettled: {
        /**
         * Delay after each request completion (ms)
         */
        delay: 0,
    },
}
```

### getGlobalSettings

Returns global settings for commands by the specified section (command).

Parameters:

- `section` — name of one of the available sections.

### setGlobalSettings

Sets global settings for commands.

The settings object for a section is merged shallowly, without deep merging.

That is, the settings object

```js
{
    matchScreenshot: {
        options: {
            threshold: 0.2,
        },
    },
}
```

will completely overwrite the `options` value in the `matchScreenshot` section with a new object containing only `threshold: 0.2`.

## Managing Cache

There's a `setCacheSettings` function for configuring file system caching. Using it, you can set settings for a corresponding entity by some key.

By default, disk caching is not performed. To enable caching, you need to set `path`.

### What can be configured for caching

```ts
{
    /**
     * Authentication data caching
     */
    auth: {
        /**
         * Path to directory where cache files should be stored
         */
        path: undefined as string | undefined,
        /**
         * Cache lifetime
         */
        ttl: 30 * 60 * 1000,
    },
}
```

### setCacheSettings

Sets file system caching parameters.

Parameters:

- `key` — entity key for configuration.
- `options` — parameters.

