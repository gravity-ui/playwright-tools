import type * as React from 'react';

import type { MountOptions, MountResult, test as ctBase } from '@playwright/experimental-ct-react';
import type { TestType } from '@playwright/test';

/**
 * Infers the TestArgs generic from a Playwright TestType.
 *
 * We need this to extract the base test args (including `mount`) from the
 * `@playwright/experimental-ct-react` test instance. The ct-react package does not
 * export its `{ mount: ... }` type as a standalone interface — it's inlined inside
 * `export const test: TestType<{ mount<HooksConfig>(...): ... }>`. This utility lets
 * us derive it from `typeof test` so it stays in sync with the source automatically.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type InferTestArgs<T> = T extends TestType<infer A, any> ? A : never;

/**
 * The base test args from `@playwright/experimental-ct-react`, including `mount`, `router`, etc.
 *
 * When building Playwright `Fixtures<T, W, PT, PW>`, any fixture key that exists only in T
 * (new fixtures) gets `scope?: 'test'` (optional), while a key that also exists in PT
 * (parent override) gets `scope: 'test'` (required). Since `mount` already exists in the
 * ct-react base, we must include it in the PT parameter so TypeScript treats our `mount`
 * as an override — otherwise `scope` becomes `'test' | undefined` which is incompatible
 * with what `base.extend()` expects.
 */
export type CtReactBaseTestArgs = InferTestArgs<typeof ctBase>;

export type MountFixturesBuilderParams = {};

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
export type MountTestOptions = {};

export type MountWorkerArgs = {};
export type MountWorkerOptions = {};

export type MountTestFixtures = MountTestArgs & MountTestOptions;
export type MountWorkerFixtures = MountWorkerArgs & MountWorkerOptions;

export type MountFixtures = MountTestFixtures & MountWorkerFixtures;
