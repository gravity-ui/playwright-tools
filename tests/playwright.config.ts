import { resolve } from 'path';

import { defineConfig, devices } from '@playwright/experimental-ct-react';
import react from '@vitejs/plugin-react';

export default defineConfig({
    testDir: './',
    testMatch: '*.test.ts{,x}',
    fullyParallel: true,
    forbidOnly: !!process.env.CI,
    retries: process.env.CI ? 2 : 0,
    workers: process.env.CI ? 1 : undefined,
    reporter: [
        ['list'],
        [
            'html',
            {
                open: process.env.CI ? 'never' : 'on-failure',
                outputFolder: resolve(
                    __dirname,
                    process.env.IS_DOCKER ? 'report-docker' : 'report',
                ),
            },
        ],
    ],
    use: {
        trace: 'on-first-retry',
        ctPort: 3100,
        screenshot: 'only-on-failure',
        ctViteConfig: {
            plugins: [react({})],
        },
    },
    projects: [
        {
            name: 'chromium',
            use: { ...devices['Desktop Chrome'] },
        },
    ],
});
