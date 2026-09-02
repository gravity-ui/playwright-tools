# Functions for Working with HAR Request Dumps

Playwright's built-in request dump mechanism allows you to save all requests executed during a test and record them to a file in HAR format. Both the request parameters and the received response are saved. You can then switch to reading from this file instead of making real requests.

All of this allows you to write integration tests for the front-end only, testing the browser code. Disabling the backend with changing data makes tests more stable.

## How it works and which Playwright versions are supported

The implementation has two tiers so that already released Playwright versions keep their historical behaviour:

- **Playwright 1.23–1.59.** The `add*Transform` functions patch Playwright's `HarRecorder` and `LocalUtilsDispatcher`, as previous releases of this package did. This preserves Playwright's own request matching and response timing and also covers `recordHar`, `tracing.startHar` and direct `routeFromHAR()` calls.
- **Playwright 1.60 and newer.** Playwright no longer ships those internal modules, so the package works through the public API instead. The first `add*Transform` / `initDumps` call of a worker process wraps the browser factories of every installed `playwright-core` (`chromium.launch()`, `connect()`, `connectOverCDP()`, `launchPersistentContext()`), and everything created below them — browsers, contexts, pages, tracing — is wrapped as it appears. Every way a dump gets written goes through the engine: `routeFromHAR({update: true})` on a page or a context, `recordHar` of `browser.newContext()` / `launchPersistentContext()` (including `use: {contextOptions: {recordHar}}`), and `context.tracing.startHar()`. Replay goes through Playwright's own HAR router; the package wraps the client-side `LocalUtils.harOpen` / `harLookup` / `harClose` calls the router makes. Without an open transform Playwright matches the requests itself. With one, the package opens the dump in memory, applies the transform and answers the router's lookups with a port of Playwright's matcher (see `har/vendor`), so the dump on disk is never rewritten. Recording goes into a private directory next to the dump (`.har-recording-<pid>-<id>/`), the record-side transforms are applied to the finished recording, and only then the dump is moved to its final location; if anything fails the dump is missing rather than committed with unscrubbed headers.

Not covered on Playwright 1.60+: `reuse-browser` / UI mode (`_newContextForReuse` bypasses `browser.newContext()`), a browser served by `launchServer()` to a client in another language, the `playwright open --save-har` CLI, and a context created before the first `add*Transform` / `initDumps` call of the worker. These write plain Playwright dumps with none of the transforms applied.

On the public-API tier, a thin client, which has no `LocalUtils` at all, falls back to replaying the dump through `context.route()` / `route.fulfill()` with the same matcher port. The fallback is functionally equivalent, but it delivers responses with a different latency profile, which can change the order in which the application under test issues follow-up requests. A dump that relies on request headers (`referer` and the like) to disambiguate two otherwise identical recorded requests may therefore match a different entry. Every fallback is announced once per process with a `HAR engine degraded (...)` warning.

The oldest supported version is **1.23** — earlier ones have no `routeFromHAR` at all, so the declared peer range `^1.22` is wider than what actually works.

Notes about the record-side hooks:

- On Playwright 1.23–1.59, `addHarRecorderTransform` runs as each entry finishes and `addFlushTransform` runs when Playwright flushes the recorder. On Playwright 1.60+, both run during post-processing after `context.close()` (or `tracing.stopHar()`). Their result is what lands on disk in either tier.
- On Playwright 1.23–1.59, `response.redirectURL` of a redirect entry is assigned by Playwright when the follow-up request starts, which can be after the per-entry hook already ran for that entry, so a base URL replacement can miss it. Replace it in `addFlushTransform` too if a redirect target must not name the live origin. On 1.60+ the hooks see the finished dump and this does not apply.
- Response bodies are stored as separate blobs referenced by `content._file`, so they are not reachable from these hooks. To replace a body you have to `delete entry.response.content._file` **and** set `content.text`; setting `text` alone has never had any effect. Rewriting a body per request is what `addHarLookupTransform`'s `transformResult` is for.
- On Playwright 1.60+ the dump is written by the client-side `context.close()`. `browser.close()` without a `context.close()` first, or a crashed browser, means Playwright never exports the recording: the dump is not updated, the recording directory is removed and a `record-not-exported` warning names the dump. Add `.har-recording-*` to the `.gitignore` of the dumps directory anyway, in case a worker is killed mid-recording; the next recording into that directory removes the leftovers of dead processes.

### Registration rules

- Each of the four `add*Transform` functions is registered **once per worker process**: the first call wins and later calls are ignored, with a `transform-registered-twice` warning when they carry a different function. Combine the recipes below into one call per hook.
- `addHarOpenTransform` is consumed when `routeFromHAR()` opens the dump, so it has to be registered before `initDumps()` / `routeFromHAR()`: at module level, or in a fixture that runs earlier. Registering it after a dump has already been opened in the worker throws.
- The other three hooks are read lazily and apply to whatever is recorded or looked up after they were registered.

### Diagnostics

Every downgrade of the engine is reported once per process as `[@gravity-ui/playwright-tools] HAR engine degraded (<code>): …`. With `PLAYWRIGHT_TOOLS_HAR_STRICT=1` in the environment every such degradation throws instead, which is what the CI of this package runs with. The codes:

| Code | Meaning |
| --- | --- |
| `no-lookup-seam` | Thin client: replay falls back to the userland engine (see above). |
| `record-not-exported` | Playwright never wrote the recording (`browser.close()` before `context.close()`, or a crash); the dump was not updated. |
| `duplicate-record-route` | A second `routeFromHAR({update: true})` into the same dump on one context; the later call is ignored. |
| `stale-recording-removed` | A recording directory of a dead process was removed from the dumps directory. |
| `transform-registered-twice` | A later `add*Transform` call with a different function was ignored. |
| `duplicate-package-copy` | Two copies of this package in one worker; the first one's engine runs for both. |
| `registry-version-mismatch` | Two copies of this package with incompatible transform registries. |
| `no-navigation-redirect` | Userland engine on a Playwright without `Route._redirectNavigationRequest`. |

## Recipes

### Connecting the Mechanism

You need to run `initDumps` for each test where you want to add dump functionality. For this purpose, you might have a test initialization file. Add there:

```ts
import { initDumps } from 'playwright-tools/har';

// ...

// Condition for working without dumps, if needed.
if (!process.env.E2E) {
  // Important: you need to specify a pattern of requests that should be intercepted and saved.
  // Most likely, we need to capture all requests except static resource requests,
  // so we use a negative lookahead around the subpattern of the regular expression.
  // That is, we specify what NOT to capture.
  const template = String.raw`^(?!.+\.(?:js|css)$|${escapeStringRegExp(
    baseURL,
  )}/(?:build|static)/.|https?://(?:storage.yandexcloud.net|yastatic.net)/.)`;
  const urlRegExp = new RegExp(template, 'i');

  await initDumps(page, testInfo, {
    // This environment variable enables dump recording mode.
    update: Boolean(process.env.PLAYWRIGHT_UPDATE_DUMPS),
    // The regular expression built above for selecting URLs to save.
    url: urlRegExp,
    // Save result as an archive (if not specified, will be a set of files).
    zip: true,
  });
}
```

Now run the test to record dumps:

```sh
PLAYWRIGHT_UPDATE_DUMPS=1 npx playwright test
```

Then run without the environment variable: it will work on saved requests.

### Patch File

For other manipulations, we'll need to use functions that make runtime changes.

For convenience, create a `playwright-patches.ts` file, which we import in the `playwright.config.ts` file, passing it the formed config:

```ts
import { playwrightPatches } from './playwright-patches';

// …

playwrightPatches(config);

export default config;
```

In `playwright-patches.ts` itself, create a function that accepts the config:

```ts
import type { PlaywrightTestConfig } from '@playwright/test';
import type { TestExtraFixtures, WorkerExtraFixtures } from '~/tests/playwright';

export function playwrightPatches(
  config: PlaywrightTestConfig<TestExtraFixtures, WorkerExtraFixtures>,
) {}
```

### Removing Headers

Cookies themselves won't be in the dumps, but there may be headers that transmit and set them. Some need to be hidden, for example session cookies. Let's add removal of any cookies passed with requests, and also remove the CSRF token header and setting it via cookie.

In the `playwright-patches.ts` file, add:

```ts
import { addHarRecorderTransform } from 'playwright-tools/har';
import { clearHeaders } from 'playwright-tools/har';

const removeHeaders = new Set(['cookie', 'x-csrf-token']);
const removeSetCookieFor = new Set(['CSRF-TOKEN']);

export function playwrightPatches(
  config: PlaywrightTestConfig<TestExtraFixtures, WorkerExtraFixtures>,
) {
  addHarRecorderTransform((entry) => {
    entry.request.headers = clearHeaders(entry.request.headers, {
      removeHeaders,
    });
    entry.response.headers = clearHeaders(entry.response.headers, {
      removeHeaders,
      removeSetCookieFor,
    });
  });
}
```

### Replacing Base URL in Dumps

Usually the host where tests are run changes when running these tests in different environments. Locally, when we record tests, it will be one, on a staging server — another, and in production — also its own. But in the dump, a specific host will be saved in the requests.

To solve this problem, let's add code that replaces the current baseURL with a placeholder when recording, and restores it to the actual baseURL when reading.

`addHarRecorderTransform` honours only its first call in a worker process (see [Registration rules](#registration-rules)), so the replacement goes into the same transform as the header cleanup above. In the `playwright-patches.ts` file:

```ts
import { addHarRecorderTransform } from 'playwright-tools/har';
import { addHarOpenTransform } from 'playwright-tools/har';
import { clearHeaders } from 'playwright-tools/har';
import { replaceBaseUrlInEntry } from 'playwright-tools/har';

const baseUrlPlaceholder = 'https://base.url.placeholder';
const removeHeaders = new Set(['cookie', 'x-csrf-token']);
const removeSetCookieFor = new Set(['CSRF-TOKEN']);

export function playwrightPatches(
  config: PlaywrightTestConfig<TestExtraFixtures, WorkerExtraFixtures>,
) {
  const baseUrl = config.use?.baseURL;

  if (!baseUrl) {
    throw new Error('baseURL should be specified in playwright config');
  }

  addHarRecorderTransform((entry) => {
    entry.request.headers = clearHeaders(entry.request.headers, {
      removeHeaders,
    });
    entry.response.headers = clearHeaders(entry.response.headers, {
      removeHeaders,
      removeSetCookieFor,
    });

    replaceBaseUrlInEntry(entry, baseUrl, baseUrlPlaceholder);
  });

  addHarOpenTransform((harFile) => {
    const entries = harFile.log.entries;

    for (const entry of entries) {
      replaceBaseUrlInEntry(entry, baseUrlPlaceholder, baseUrl);
    }
  });
}
```

### Modifying HTML Pages

A complex case can be when some data is placed on the HTML of the loaded page when requested from the server. Then you need to add the page to the dump cache. But if something changes on the server (for example, the list of connected scripts), you need to request the actual page from the server. It turns out you need to request the actual page, but add something from the dump to it.

```ts
import { addHarLookupTransform } from 'playwright-tools/har';

export function playwrightPatches(config: PlaywrightTestConfig<TestExtraFixtures, WorkerExtraFixtures>) {
    const baseUrl = config.use?.baseURL;

    if (!baseUrl) {
        throw new Error('baseURL should be specified in playwright config');
    }

    // Process found requests
    addHarLookupTransform(undefined, async (result, params) => {
        // Completed request with body
        if (result.action !== 'fulfill' || !result.body) {
            return result;
        }

        const type = result.headers?.find((header) => header.name.toLowerCase() === 'content-type');

        // This is HTML
        if (!type?.value.startsWith('text/html')) {
            return result;
        }

        const body = result.body.toString('utf8');

        // With non-empty body
        if (!body) {
            return result;
        }

        // Execute our function that will make the necessary replacements and return a new body variant
        const nextBody = await transformHtml(body, baseUrl, params.headers);

        // Write the new response body to the result, replacing the body from the dump
        if (nextBody) {
            result.body = Buffer.from(nextBody, 'utf8');
        }

        return result;
    });
```

### Two Identical Requests Within a Test

Sometimes within a test, some action is executed twice that produces an identical request in terms of parameters, but with a different result (we changed something, and the result should now come back different).

Playwright will look for the first matching request in the dumps, so on replay we'll get the result from the first one on the second execution too.

To avoid this, you can artificially add a difference to the request. The easiest way is to add a custom header. There's a special helper `setExtraHash` for this.

```ts
import { setExtraHash } from 'playwright-tools/har';

test('My test', async ({ page }) => {
  const my = new MyPage(page);

  await my.goto();
  // Request is made
  await my.clickRequestButton();
  // Check result for expected
  await my.assertResult('First run');

  // Set header with some new value
  await setExtraHash('change');

  // Action that will change the result
  await my.changeSomething();
  // Repeated request with the same parameters
  await my.clickRequestButton();
  // Check result for expected
  await my.assertResult('Second run');
});
```

## initDumps

Makes necessary preparations for saving request dumps.
Returns `true` when working in update mode.

```ts
async function initDumps(page: Page, testInfo: TestInfo, options?: InitDumpsOptions): boolean;
```

```ts
type InitDumpsOptions = {
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
   * Path to project root directory, relative to which the path to the dumps
   * directory will be calculated (if not specified, path is absolute)
   */
  rootPath?: string;

  /**
   * Recording mode: write requests to file instead of reading from it
   * @defaultValue `false`
   */
  update?: boolean;

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
   * Behavior mode for requests not found in the archive
   * @defaultValue `'abort'`
   */
  notFound?: 'abort' | 'fallback';

  /**
   * Request URL pattern to be processed
   */
  url?: string | RegExp;

  /**
   * Pack result into archive
   * @defaultValue `true`
   */
  zip?: boolean;
};
```

## addHarLookupTransform

Allows making modifications during the search phase for a dump entry matching the request.

Registered once per worker process: the first call wins, see [Registration rules](#registration-rules).

Using this hook, you can replace something in the response body that was selected for the request from the dump. Also, change something in the parameters based on which the search will be performed.

Accepts parameters:

- `transformParams` — Function to modify parameters based on which the search will be performed
- `transformResult` — Function to modify the search result (here you can change the parameters of the found response, for example its body)

```ts
function addHarLookupTransform(
  transformParams?: HarLookupParamsTransformFunction,
  transformResult?: HarLookupResultTransformFunction,
): void;
```

```ts
type HarLookupParamsTransformFunction = (
  params: LocalUtilsHarLookupParams,
) => LocalUtilsHarLookupParams;

type HarLookupResultTransformFunction = (
  result: LocalUtilsHarLookupResult,
  params: LocalUtilsHarLookupParams,
) => LocalUtilsHarLookupResult | Promise<LocalUtilsHarLookupResult>;
```

## addHarOpenTransform

Allows making changes to the JSON read from an opened HAR file.

The hook fires after the HAR file has been read and parsed into a JS object from JSON. That is, we have the entire HAR object with all information and an array of all requests. You can change something en masse across all requests.

It has to be registered before the dump is opened by `initDumps()` / `routeFromHAR()`; registering it later throws. Registered once per worker process: the first call wins, see [Registration rules](#registration-rules).

```ts
function addHarOpenTransform(transform: HarTransformFunction): void;

type HarTransformFunction = (harFile: HARFile) => void;
```

## addHarRecorderTransform

Allows making changes to the JSON that will be written to the HAR file.

The hook fires before the request data object is added to the HAR file object. One request's data comes in. You can change something in it before it's recorded.

Registered once per worker process: the first call wins, see [Registration rules](#registration-rules).

```ts
function addHarRecorderTransform(transform: EntryTransformFunction): void;

type EntryTransformFunction = (entry: Entry) => void;
```

## clearHeaders

Helper function that clears specified headers.

Convenient to use in `addHarRecorderTransform` to remove private headers and cookies.

```ts
function clearHeaders(headers: Header[], options: ClearHeadersOptions): Header[];
```

```ts
type ClearHeadersOptions = {
  removeHeaders?: Set<string>;
  removeSetCookieFor?: Set<string>;
};
```

## replaceBaseUrlInEntry

Helper function that replaces the base URL in a HAR file request entry.

Parameters:

- `entry` — Entry from HAR file
- `fromUrl` — URL to replace
- `toUrl` — URL to replace with

```ts
function replaceBaseUrlInEntry(entry: Entry, fromUrl: string, toUrl: string): void;
```

## setExtraHash

Sets a header that can help distinguish requests with identical parameters.

Simple wrapper over `addExtraHttpHeader`, with a standard header name already built in.

You can pass `null` as the value to remove the header (via `removeExtraHttpHeader`).

```ts
function setExtraHash(page: Page, value: string | null): Promise<void>;
```

## installHarEngine

Makes the registered transforms effective in the current worker process. Every `add*Transform` function and `initDumps` call it, so there is normally no reason to call it yourself.

On Playwright 1.23–1.59 it installs the historical internal patches. On Playwright 1.60+ it wraps the browser factories of every installed `playwright-core` (see [How it works](#how-it-works-and-which-playwright-versions-are-supported)), which covers `routeFromHAR()`, `recordHar` and `tracing.startHar()` on everything created afterwards. It throws when no `playwright-core` can be resolved from the package, so a broken installation fails loudly instead of writing unscrubbed dumps.

Passing a page or a context additionally wraps that object's own prototypes. This only matters when it comes from a `playwright-core` copy the package could not resolve itself, or was created before the first registration in the worker.

```ts
function installHarEngine(target?: Page | BrowserContext): void;
```
