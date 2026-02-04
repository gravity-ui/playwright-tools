import type {
    Fixtures,
    PlaywrightTestArgs,
    PlaywrightTestOptions,
    PlaywrightWorkerArgs,
    PlaywrightWorkerOptions,
    TestFixture,
} from '@playwright/test';

import { initDumps } from '../../har';

import { harPatcher } from './har-patcher';
import type {
    MockNetworkFixtureBuilderParams,
    MockNetworkTestFixtures,
    MockNetworkWorkerFixtures,
} from './types';

export function mockNetworkFixturesBuilder({
    shouldUpdate,
    forceUpdateIfHarMissing,
    updateTimeout,
    zip = true,
    url: urlMatcherBuilder,
    dumpsFilePath,
    ...harPatcherParams
}: MockNetworkFixtureBuilderParams) {
    const isMockingEnabledFixture: TestFixture<
        boolean,
        PlaywrightTestArgs & PlaywrightTestOptions & MockNetworkTestFixtures
    > = async ({ baseURL: rawBaseURL, page, enableNetworkMocking }, use, testInfo) => {
        if (!enableNetworkMocking) {
            return use(false);
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

        const finalUpdate = await initDumps(page, testInfo, {
            dumpsFilePath,
            forceUpdateIfHarMissing,
            updateTimeout,
            update,
            url,
            zip,
        });

        await use(!finalUpdate);
    };

    const fixtures: Fixtures<
        MockNetworkTestFixtures,
        MockNetworkWorkerFixtures,
        PlaywrightTestArgs & PlaywrightTestOptions,
        PlaywrightWorkerArgs & PlaywrightWorkerOptions
    > = {
        enableNetworkMocking: [true, { scope: 'test', option: true }],
        isMockingEnabled: [isMockingEnabledFixture, { scope: 'test', auto: true }],
    };

    return fixtures;
}
