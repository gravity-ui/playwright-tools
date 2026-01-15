import type {
    PlaywrightTestArgs,
    PlaywrightTestOptions,
    TestFixture,
    TestInfo,
} from '@playwright/test';

import { initDumps } from '../../har';

import { harPatcher } from './har-patcher';
import type { MockNetworkFixtureBuilderParams, OptionallyEnabledTestArgs } from './types';

const fixtureFunction = async (
    {
        baseURL: rawBaseURL,
        page,
    }: Pick<PlaywrightTestArgs & PlaywrightTestOptions, 'baseURL' | 'page'> &
        OptionallyEnabledTestArgs,
    {
        shouldUpdate,
        forceUpdateIfHarMissing,
        updateTimeout,
        zip = true,
        url: urlMatcherBuilder,
        dumpsFilePath,
        ...harPatcherParams
    }: MockNetworkFixtureBuilderParams,
    use: (r: boolean) => Promise<void>,
    testInfo: TestInfo,
) => {
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

export function mockNetworkFixtureBuilder<
    TestArgs extends PlaywrightTestArgs & PlaywrightTestOptions = PlaywrightTestArgs &
        PlaywrightTestOptions,
>({
    shouldUpdate,
    forceUpdateIfHarMissing,
    updateTimeout,
    zip = true,
    url,
    dumpsFilePath,
    optionallyEnabled,
    ...harPatcherParams
}: MockNetworkFixtureBuilderParams) {
    const mockNetworkFixture: TestFixture<boolean, TestArgs> = async (
        { baseURL, page },
        use,
        testInfo,
    ) => {
        return fixtureFunction(
            { baseURL, page },
            {
                shouldUpdate,
                forceUpdateIfHarMissing,
                updateTimeout,
                zip,
                url,
                dumpsFilePath,
                ...harPatcherParams,
            },
            use,
            testInfo,
        );
    };

    const mockNetworkFixtureWithOptionalParam: TestFixture<
        boolean,
        TestArgs & OptionallyEnabledTestArgs
    > = async ({ baseURL, page, enableNetworkMocking }, use, testInfo) => {
        if (!enableNetworkMocking) {
            return use(false);
        }

        return fixtureFunction(
            { baseURL, page },
            {
                shouldUpdate,
                forceUpdateIfHarMissing,
                updateTimeout,
                zip,
                url,
                dumpsFilePath,
                ...harPatcherParams,
            },
            use,
            testInfo,
        );
    };

    const fixtureOptions = {
        auto: true,
        scope: 'test' as const,
    };

    const mockNetwork: [typeof mockNetworkFixture, typeof fixtureOptions] = [
        optionallyEnabled ? mockNetworkFixtureWithOptionalParam : mockNetworkFixture,
        fixtureOptions,
    ];

    return mockNetwork;
}
