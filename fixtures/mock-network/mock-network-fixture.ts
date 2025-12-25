import type { PlaywrightTestArgs, PlaywrightTestOptions, TestFixture } from '@playwright/test';

import { initDumps } from '../../har';

import { harPatcher } from './har-patcher';
import type { MockNetworkFixtureBuilderParams } from './types';

export function mockNetworkFixtureBuilder<
    TestArgs extends PlaywrightTestArgs & PlaywrightTestOptions = PlaywrightTestArgs &
        PlaywrightTestOptions,
>({
    shouldUpdate,
    forceUpdateIfHarMissing,
    updateTimeout,
    zip = true,
    url: urlMatcherBuilder,
    dumpsFilePath,
    enabled,
    ...harPatcherParams
}: MockNetworkFixtureBuilderParams<TestArgs>) {
    const mockNetworkFixture: TestFixture<boolean, TestArgs> = async (options, use, testInfo) => {
        const { baseURL: rawBaseURL, page } = options;

        if (enabled && !enabled(options)) {
            await use(false);
            return;
        }

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
