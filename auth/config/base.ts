import type { PlaywrightTestConfig } from '@playwright/test';
import { devices } from '@playwright/test';

export const baseConfig: PlaywrightTestConfig = {
    forbidOnly: Boolean(process.env.CI),
    retries: process.env.CI ? 2 : 1,
    timeout: process.env.CI ? 15_000 : 30_000,
    workers: process.env.CI ? 2 : undefined,
    maxFailures: process.env.CI ? 50 : undefined,

    use: {
        ignoreHTTPSErrors: true,

        colorScheme: 'light',
        locale: 'ru-RU',
        timezoneId: 'Europe/Moscow',

        screenshot: 'only-on-failure',
        video: 'off',
        trace: 'on-first-retry',

        baseURL: 'https://localhost',
    },
    reporter: [[process.env.CI ? 'list' : 'line'], ['html']],
    reportSlowTests: {
        threshold: process.env.CI ? 10_000 : 15_000,
        max: 10,
    },
    projects: [
        {
            name: 'Chrome',
            use: {
                ...devices['Desktop Chrome'],
            },
        },
    ],
};
export default baseConfig;
