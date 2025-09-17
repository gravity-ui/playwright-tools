import type { PlaywrightTestArgs, PlaywrightTestOptions, TestFixture } from '@playwright/test';

import { TEST_WRAPPER_CLASS } from './constants';
import type { MountFn, MountTestArgs } from './types';

export const mountFixture: TestFixture<
    MountFn,
    PlaywrightTestArgs & PlaywrightTestOptions & MountTestArgs
> = async ({ mount: baseMount }, use) => {
    const mount: MountFn = async (component, options) => {
        return await baseMount(
            <div
                style={{
                    padding: 20,
                    // When we set width we didn't expect that paddings for better screenshots would be included
                    boxSizing: options?.width ? 'content-box' : undefined,
                    width: options?.width ? options.width : 'fit-content',
                    height: 'fit-content',
                    ...options?.rootStyle,
                }}
                className={TEST_WRAPPER_CLASS}
            >
                {/* Do not scale buttons while clicking. Floating UI might position its elements differently in every test run. */}
                <style>{'.g-button, .g-button::after { transform: scale(1) !important; }'}</style>
                {component}
            </div>,
            options,
        );
    };

    await use(mount);
};
