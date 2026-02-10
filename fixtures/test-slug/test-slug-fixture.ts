import type {
    Fixtures,
    PlaywrightTestArgs,
    PlaywrightTestOptions,
    PlaywrightWorkerArgs,
    PlaywrightWorkerOptions,
    TestFixture,
} from '@playwright/test';

import { getTestSlug, setTestSlug } from '../../actions';

import type {
    TestSlugFixturesBuilderParams,
    TestSlugResult,
    TestSlugTestFixtures,
    TestSlugWorkerFixtures,
} from './types';

export function testSlugFixturesBuilder(_params: TestSlugFixturesBuilderParams = {}) {
    const testSlugFixture: TestFixture<
        TestSlugResult,
        PlaywrightTestArgs & PlaywrightTestOptions
    > = async ({ page }, use, testInfo) => {
        setTestSlug(page, testInfo.title);

        const slug = getTestSlug(page);

        await use(slug);
    };

    const fixtures: Fixtures<
        TestSlugTestFixtures,
        TestSlugWorkerFixtures,
        PlaywrightTestArgs & PlaywrightTestOptions,
        PlaywrightWorkerArgs & PlaywrightWorkerOptions
    > = {
        testSlug: [testSlugFixture, { auto: true }],
    };

    return fixtures;
}
