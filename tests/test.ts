import { test as base } from '@playwright/experimental-ct-react';
import type {
    Fixtures,
    PlaywrightTestArgs,
    PlaywrightTestOptions,
    PlaywrightWorkerArgs,
    PlaywrightWorkerOptions,
} from '@playwright/test';

import type {
    CtReactBaseTestArgs,
    MountTestFixtures,
    MountWorkerFixtures,
} from '../component-tests/fixtures';
import { mountFixturesBuilder } from '../component-tests/fixtures';
import type {
    ExpectRequestTestFixtures,
    ExpectRequestWorkerFixtures,
    ExpectScreenshotTestFixtures,
    ExpectScreenshotWorkerFixtures,
    GlobalSettingsTestFixtures,
    GlobalSettingsWorkerFixtures,
    TestSlugTestFixtures,
    TestSlugWorkerFixtures,
} from '../fixtures';
import {
    expectRequestFixturesBuilder,
    expectScreenshotFixturesBuilder,
    globalSettingsFixturesBuilder,
    testSlugFixturesBuilder,
} from '../fixtures';

// Core fixtures for testing
export type CommonTestFixtures = MountTestFixtures &
    TestSlugTestFixtures &
    ExpectRequestTestFixtures &
    ExpectScreenshotTestFixtures &
    GlobalSettingsTestFixtures;

export type CommonWorkerFixtures = MountWorkerFixtures &
    TestSlugWorkerFixtures &
    ExpectRequestWorkerFixtures &
    ExpectScreenshotWorkerFixtures &
    GlobalSettingsWorkerFixtures;

const mountFixtures = mountFixturesBuilder();
const testSlugFixtures = testSlugFixturesBuilder();
const expectRequestFixtures = expectRequestFixturesBuilder();
const globalSettingsFixtures = globalSettingsFixturesBuilder();
const expectScreenshotFixtures = expectScreenshotFixturesBuilder();

const fixtures: Fixtures<
    CommonTestFixtures,
    CommonWorkerFixtures,
    PlaywrightTestArgs & PlaywrightTestOptions & CtReactBaseTestArgs,
    PlaywrightWorkerArgs & PlaywrightWorkerOptions
> = {
    ...mountFixtures,
    ...testSlugFixtures,
    ...expectRequestFixtures,
    ...globalSettingsFixtures,
    ...expectScreenshotFixtures,
};

/**
 * Test instance with all custom fixtures applied.
 * Import this in your test files instead of the base test from Playwright.
 */
export const test = base.extend(fixtures);

export { expect } from '@playwright/experimental-ct-react';
