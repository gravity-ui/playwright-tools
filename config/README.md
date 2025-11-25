# Base Configuration

Can be used as a configuration example, or imported and extended in your project.

## base

All essential settings for Playwright test configuration. This base config includes:
- Different settings for CI and local environments (retries, timeouts, workers)
- Default test options (locale, timezone, screenshot/video settings)
- Reporter configuration
- Default Chrome browser project

In the config, `use.baseURL` is set to `https://localhost`. You should change it to your service address. For example, you can create a new object based on the base config with overrides:

```ts
{
    ...baseConfig,
    use: {
        ...baseConfig.use,
        baseURL: 'https://your-service-url.com',
    },
}
```

The default browser is Desktop Chrome only.

## browsers

Collection of standard browsers. Contains both desktop and mobile browsers.

Browser configurations include a non-standard `projectName` parameter to make it easy to filter tests by browser (for example, via `test.skip`). To use this parameter, you need to specify it in your extension for `test`.

Provides a combined list of browsers from browsersDesktop and browsersMobile.

For a complete list of browsers that Playwright can emulate, see [deviceDescriptorsSource.json](https://github.com/microsoft/playwright/blob/main/packages/playwright-core/src/server/deviceDescriptorsSource.json).

## browsersDesktop

Desktop browsers only.

Browsers in the set:
- `Chrome` (Desktop Chrome)
- `Safari` (Desktop Safari)
- `Firefox` (Desktop Firefox)

## browsersMobile

Mobile browsers only.

Browsers in the set:
- `Android` (Pixel 5)
- `iPhone` (iPhone 12)

