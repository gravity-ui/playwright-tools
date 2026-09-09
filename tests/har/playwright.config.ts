import { resolve } from 'path';

import { defineConfig, devices } from '@playwright/test';

// A plain (non component-testing) config: the HAR engine needs a real page
// navigating to a real origin, which the component-tests runner cannot provide.
export default defineConfig({
    testDir: './',
    testMatch: '*.test.ts',
    fullyParallel: false,
    forbidOnly: Boolean(process.env.CI),
    retries: 0,
    workers: 1,
    reporter: [
        ['list'],
        [
            'html',
            {
                open: process.env.CI ? 'never' : 'on-failure',
                outputFolder: resolve(__dirname, '../../playwright-report-har'),
            },
        ],
    ],
    use: {
        trace: 'on-first-retry',
    },
    projects: [
        {
            name: 'chromium',
            use: { ...devices['Desktop Chrome'] },
        },
    ],
});
