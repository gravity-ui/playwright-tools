import type {
    Fixtures,
    PlaywrightTestArgs,
    PlaywrightTestOptions,
    PlaywrightWorkerArgs,
    PlaywrightWorkerOptions,
    TestFixture,
} from '@playwright/test';

import { createComponentWrapper } from './mount-wrapper';
import type {
    CtReactBaseTestArgs,
    MountFixturesBuilderParams,
    MountFn,
    MountTestFixtures,
    MountWorkerFixtures,
} from './types';

/**
 * Builder function for mount fixtures.
 * Creates an enhanced mount fixture that wraps components with styling and layout controls.
 *
 * This fixture intercepts the base mount function to:
 * 1. Always wrap components in a div with TEST_WRAPPER_CLASS for screenshot targeting
 * 2. Apply padding and fit-content sizing for better visual testing
 * 3. Disable CSS transform animations that can cause flaky screenshots
 * 4. Support custom width and rootStyle options
 *
 * The wrapper is inlined using string element types ('div', 'style') because
 * Playwright blocks function components defined in test context. See mount-wrapper.ts
 * for more details on this restriction.
 */
export function mountFixturesBuilder(_params: MountFixturesBuilderParams = {}) {
    const mountFixture: TestFixture<
        MountFn,
        PlaywrightTestArgs & PlaywrightTestOptions & MountTestFixtures
    > = async ({ mount: baseMount }, use) => {
        const mount: MountFn = async (component, options) => {
            const { width, rootStyle, ...baseMountOptions } = options || {};

            const wrapper = createComponentWrapper(component, { width, rootStyle });

            return await baseMount(wrapper, baseMountOptions);
        };

        await use(mount);
    };

    const fixtures: Fixtures<
        MountTestFixtures,
        MountWorkerFixtures,
        PlaywrightTestArgs & PlaywrightTestOptions & CtReactBaseTestArgs,
        PlaywrightWorkerArgs & PlaywrightWorkerOptions
    > = {
        mount: [mountFixture, { scope: 'test' as const }],
    };

    return fixtures;
}
