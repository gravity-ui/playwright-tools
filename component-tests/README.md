# Component Testing Utilities

This module provides utilities and fixtures for Playwright Component Testing.

## Utils

### createSmokeScenarios

A utility for generating test scenarios from component props variations. It creates a set of test cases based on a base props object and variations for each prop.

```ts
import { createSmokeScenarios } from 'playwright-tools/component-tests';

const scenarios = createSmokeScenarios(
    // Base props
    {
        theme: 'light',
        size: 'medium',
        disabled: false,
    },
    // Prop variations
    {
        theme: ['dark'],
        size: ['small', 'large'],
        disabled: [true],
    },
);

// Returns array of [scenarioName, props] tuples:
// [
//   ['[default]', { theme: 'light', size: 'medium', disabled: false }],
//   ['[theme: dark]', { theme: 'dark', size: 'medium', disabled: false }],
//   ['[size: small]', { theme: 'light', size: 'small', disabled: false }],
//   ['[size: large]', { theme: 'light', size: 'large', disabled: false }],
//   ['[disabled: true]', { theme: 'light', size: 'medium', disabled: true }],
// ]
```

#### Named Cases

For complex values or custom names, use named cases:

```ts
const scenarios = createSmokeScenarios(
    { config: { mode: 'default' } },
    {
        config: [
            ['advanced-mode', { mode: 'advanced', features: ['a', 'b'] }],
            ['minimal-mode', { mode: 'minimal' }],
        ],
    },
);
```

#### Custom Scenario Name Prefix

```ts
const scenarios = createSmokeScenarios(
    { theme: 'light' },
    { theme: ['dark'] },
    { scenarioName: 'Button' },
);

// Returns:
// [
//   [' Button [default]', { theme: 'light' }],
//   [' Button [theme: dark]', { theme: 'dark' }],
// ]
```

## Fixtures

### mount

Enhanced mount fixture for Playwright Component Testing that wraps React components with a styled container for better test consistency and visual testing.

Extend `test` in Playwright:

```ts
import type {
    MountTestFixtures,
    MountWorkerFixtures,
} from 'playwright-tools/component-tests';
import { mountFixturesBuilder, TEST_WRAPPER_CLASS } from 'playwright-tools/component-tests';

export type TestExtraFixtures = MountTestFixtures;
export type WorkerExtraFixtures = MountWorkerFixtures;

const mountFixtures = mountFixturesBuilder();

export const test = baseTest.extend<TestExtraFixtures, WorkerExtraFixtures>({
    ...mountFixtures,
});
```

Usage in test:

```ts
import { MyButton } from './MyButton';

test('renders button correctly', async ({ mount }) => {
    const component = await mount(
        <MyButton label="Click me" />,
        {
            width: 300,
            rootStyle: { 
                backgroundColor: '#f0f0f0',
            },
        }
    );

    await expect(component).toBeVisible();
});
```

#### Features

The mount fixture enhances the base Playwright mount function with:

1. **Wrapper Container**: Wraps components in a styled div with 20px padding for better screenshots
2. **Flexible Sizing**: Uses `fit-content` by default, or accepts custom width
3. **Button Stability**: Prevents button scale animations during clicks to ensure consistent positioning
4. **Identifiable Class**: Adds `TEST_WRAPPER_CLASS` (`playwright-wrapper-test`) to the wrapper for easy targeting

#### Mount Options

Extends standard Playwright mount options with:

```ts
type MountFn = <HooksConfig>(
    component: React.JSX.Element,
    options?: MountOptions<HooksConfig> & {
        /**
         * Width of the wrapper container
         * When set, uses content-box sizing so padding doesn't affect the specified width
         * @example 300 or '300px'
         */
        width?: number | string;
        
        /**
         * Additional CSS styles to apply to the wrapper container
         * Merged with default styles (padding: 20, width: 'fit-content', height: 'fit-content')
         */
        rootStyle?: React.CSSProperties;
    },
) => Promise<MountResult>;
```

#### Exported Constants

- `TEST_WRAPPER_CLASS` - The CSS class name applied to the wrapper div (`'playwright-wrapper-test'`)

