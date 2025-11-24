# Helper Functions

## extractTestSlug

Extracts the test identifier from its title, for use in the path to test artifacts.

It's assumed that the identifier is written at the end of the test name in square brackets:  
`'My test title [my-test]'`

Otherwise, it's formed from the title, excluding all special characters, for example:  
`'My test title 1 @test @tag'` -> `'my-test-title-1-test-tag'`

Used in `setTestSlug`.

Parameters:
- `title: string` — Test title

## fetchWithoutRejectUnauthorized

Node.js native `fetch` with the `rejectUnauthorized: false` parameter.

The flag disables certificate verification, which can be useful in tests for accessing staging servers where the certificate is not recognized by the system.

Parameters:
- `input: RequestInfo` — URL or request object
- `init?: RequestInit` — request initialization object

## getCookieDomain

Returns the domain for cookies based on baseURL from config.

Keeps only two levels in the domain, removes port specification, adds a dot at the beginning.

`https://some.domain.yandex.ru:8080/` → `.yandex.ru`

Parameters:
- `baseURL: string` — baseURL value, available in test fixtures.

## NeverError

Error object for unreachable values. The constructor parameter is a value of type `never`, meaning the code should not reach this point.

Useful for use in the `default` of a `switch…case` that shouldn't have a variant.

## waitForResolve

Waits until the checking function returns `true`.

The checking function is run at a specified interval and its value is checked. If it returns `true`, completes successfully, otherwise — keeps waiting. On timeout or error in the checking function, completes unsuccessfully.

Parameters:
- `solver: () => boolean | PromiseLike<boolean>` — Checking function
- `options?: WaitForResolveOptions` — Parameters

```ts
type WaitForResolveOptions = {
    /**
     * Interval between checks (ms)
     * @defaultValue `100`
     */
    interval?: number;
    /**
     * Timeout after which checks are interrupted (ms)
     * `0` — no limit
     * @defaultValue `5000`
     */
    timeout?: number;
};
```

## waitHttpService

Waits for a response with the required status on the specified URL.

```ts
type WaitHttpServiceOptions = {
    /** URL to check */
    url: string;
    /**
     * Request method
     * @default 'HEAD'
     */
    method?: string;
    /**
     * Expected response status
     * @default 200
     */
    expectedStatus?: number;
    /**
     * Interval between requests
     * @default 1000
     */
    interval?: number;
    /**
     * Wait time
     * @default Infinity
     */
    timeout?: number;
}
```

Suitable for organizing a service readiness ping on baseURL. This might look something like:

tests/setup/ping-base-url.setup.ts
```ts
import { URL } from 'node:url';
import { test as setup } from '@playwright/test';
import { waitHttpService } from 'playwright-tools/utils';

setup('Ping baseURL', async ({ baseURL }) => {
    const timeout = 60_000 * 5;

    setup.setTimeout(timeout + 1000);

    const url = new URL('/ping', baseURL);

    await setup.step(
        `Waiting for response on ${url.href}`,
        () =>
            waitHttpService({
                url: url.href,
                interval: 5000,
                timeout,
            }),
        { box: true },
    );
});
```

tests/playwright.config.ts
```ts
export const config = defineConfig({
    projects: [
        {
            name: 'Ping canary',
            testDir: 'setup',
            testMatch: 'ping-base-url.setup.ts',
            retries: 0,
            use: {
                baseURL: 'canary.example.com',
            },
        },
        {
            name: 'Canary',
            testMatch: '*.canary.test.ts',
            use: {
                ...devices['Desktop Chrome'],
                baseURL: 'canary.example.com',
            },
            dependencies: ['Ping canary'],
        },
    ],
});
export default config;
```

## Working with Cache

### deleteCache

Deletes the cache file.

- `path: string` — Path to cache directory.
- `name: string` — Cache name (without extension).

### readCache

Returns contents from the cache file.

- `path: string` — Path to cache directory.
- `name: string` — Cache name (without extension).
- `ttl: string` — Cache lifetime (ms).

### writeCache

Writes data to cache file.

- `path: string` — Path to cache directory.
- `name: string` — Cache name (without extension).
- `data: string` — Data to write to cache.

