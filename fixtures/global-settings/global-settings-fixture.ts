import type {
    Fixtures,
    PlaywrightTestArgs,
    PlaywrightTestOptions,
    PlaywrightWorkerArgs,
    PlaywrightWorkerOptions,
    TestFixture,
    WorkerFixture,
} from '@playwright/test';

import { getGlobalSettings, setGlobalSettings } from '../../actions';

import type {
    GlobalSettingsFixturesBuilderParams,
    GlobalSettingsTestArgs,
    GlobalSettingsWorkerArgs,
} from './types';

export function globalSettingsFixturesBuilder(
    { globalSettings }: GlobalSettingsFixturesBuilderParams = { globalSettings: {} },
) {
    const initGlobalSettingsFixture: WorkerFixture<
        void,
        PlaywrightWorkerArgs & PlaywrightWorkerOptions
        // eslint-disable-next-line no-empty-pattern
    > = async ({}, use) => {
        setGlobalSettings(globalSettings);

        await use();
    };

    const setGlobalSettingsFixture: TestFixture<
        typeof setGlobalSettings,
        PlaywrightTestArgs & PlaywrightTestOptions
        // eslint-disable-next-line no-empty-pattern
    > = async ({}, use) => {
        await use(setGlobalSettings);
    };

    const getGlobalSettingsFixture: TestFixture<
        typeof getGlobalSettings,
        PlaywrightTestArgs & PlaywrightTestOptions
        // eslint-disable-next-line no-empty-pattern
    > = async ({}, use) => {
        await use(getGlobalSettings);
    };

    const fixtures: Fixtures<
        GlobalSettingsTestArgs,
        GlobalSettingsWorkerArgs,
        PlaywrightTestArgs & PlaywrightTestOptions,
        PlaywrightWorkerArgs & PlaywrightWorkerOptions
    > = {
        initGlobalSettings: [initGlobalSettingsFixture, { scope: 'worker', auto: true }],
        setGlobalSettings: [setGlobalSettingsFixture, { scope: 'test' }],
        getGlobalSettings: [getGlobalSettingsFixture, { scope: 'test' }],
    };

    return fixtures;
}
