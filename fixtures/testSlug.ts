import type { TestFixture } from '@playwright/test';

import { getTestSlug, setTestSlug } from '../actions';

import type { PlaywrightTestArgsBase } from './types';

export type TestSlugResult = string;

const testSlugValue: TestFixture<TestSlugResult, PlaywrightTestArgsBase> = async (
    { page },
    use,
    testInfo,
) => {
    setTestSlug(page, testInfo.title, true);

    const slug = getTestSlug(page);

    await use(slug);
};

const fixtureOptions = {
    auto: true,
};

/**
 * Automatically sets and adds the current slug value for the test to the test fixtures
 */
export const testSlug: [typeof testSlugValue, typeof fixtureOptions] = [
    testSlugValue,
    fixtureOptions,
];
