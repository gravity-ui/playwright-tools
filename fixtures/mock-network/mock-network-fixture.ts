import type { PlaywrightTestArgs, PlaywrightTestOptions, TestFixture } from '@playwright/test';

import { initDumps } from '../../har';

import { harPatcher } from './har-patcher';
import type { MockNetworkFixtureBuilderParams } from './types';

export function mockNetworkFixtureBuilder({
    shouldUpdate,
    forceUpdateIfHarMissing,
    updateTimeout,
    zip = true,
    url: urlMatcherBuilder,
    dumpsPath,
    dumpsFilePath,

    ...harPatcherParams
}: MockNetworkFixtureBuilderParams) {
    const mockNetworkFixture: TestFixture<
        boolean,
        PlaywrightTestArgs & PlaywrightTestOptions
    > = async ({ baseURL: rawBaseURL, page }, use, testInfo) => {
        if (!rawBaseURL) {
            throw new Error('baseURL should be specified in playwright config');
        }

        const baseURL = rawBaseURL.replace(/\/+$/, '');

        harPatcher({
            baseURL,
            ...harPatcherParams,
        });

        const update = Boolean(shouldUpdate);

        const url = urlMatcherBuilder(baseURL);

        await initDumps(page, testInfo, {
            dumpsPath,
            dumpsFilePath,
            forceUpdateIfHarMissing,
            updateTimeout,
            update,
            url,
            zip,
        });

        await use(!update);
    };

    const fixtureOptions = {
        auto: true,
        scope: 'test' as const,
    };

    const mockNetwork: [typeof mockNetworkFixture, typeof fixtureOptions] = [
        mockNetworkFixture,
        fixtureOptions,
    ];

    return mockNetwork;
}
