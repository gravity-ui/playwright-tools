import type {
    PlaywrightTestArgs,
    PlaywrightTestOptions,
    PlaywrightWorkerArgs,
    PlaywrightWorkerOptions,
} from '@playwright/test';

export type AllPlaywrightTestFixtures = PlaywrightTestArgs & PlaywrightTestOptions;
export type AllPlaywrightWorkerFixtures = PlaywrightWorkerArgs & PlaywrightWorkerOptions;
export type PlaywrightTestArgsBase = AllPlaywrightTestFixtures & AllPlaywrightWorkerFixtures;
