import type * as React from 'react';

import type { MountOptions, MountResult } from '@playwright/experimental-ct-react';

export type MountFn = <HooksConfig>(
    component: React.JSX.Element,
    options?: MountOptions<HooksConfig> & {
        width?: number | string;
        rootStyle?: React.CSSProperties;
    },
) => Promise<MountResult>;

export type MountTestArgs = {
    mount: MountFn;
};
