import type * as React from 'react';

import { TEST_WRAPPER_CLASS } from './constants';

/**
 * Playwright JSX object structure that mimics Playwright's jsx-runtime output.
 * This is the internal structure Playwright expects when mounting components.
 */
type PlaywrightJsxObject<T extends keyof React.JSX.IntrinsicElements> = {
    __pw_type: 'jsx';
    type: T;
    props: React.JSX.IntrinsicElements[T];
    key: string | null;
};

/**
 * Creates a Playwright JSX object representation.
 *
 * Playwright expects JSX components in a special format with __pw_type: 'jsx'.
 * This mimics what Playwright's jsx-runtime creates when you write JSX in test files.
 *
 * IMPORTANT: The `type` parameter MUST be either:
 * - A string (HTML element name like 'div', 'span', 'style')
 * - An import reference resolved by Playwright's import registry
 *
 * Function references are explicitly blocked by Playwright's serializers.js:
 * "if (value?.__pw_type === 'jsx' && typeof value.type === 'function')"
 * This prevents components defined in test context from being mounted.
 *
 * That's why we use only string types (like 'div', 'style')
 * instead of function component references.
 *
 * @template T - The HTML element type (e.g., 'div', 'span', 'style')
 * @param type - HTML element name
 * @param props - Props for the HTML element
 * @returns A Playwright JSX object compatible with React.JSX.Element
 */
function createPlaywrightJsxObject<T extends keyof React.JSX.IntrinsicElements>(
    type: T,
    props: React.JSX.IntrinsicElements[T],
): PlaywrightJsxObject<T> {
    return {
        __pw_type: 'jsx',
        type,
        props,
        key: null, // Must be null (not undefined) to match React.JSX.Element type
    };
}

/**
 * Creates a wrapper around a component with styling and animation controls.
 *
 * This wrapper:
 * 1. Wraps component in a div with TEST_WRAPPER_CLASS for screenshot targeting
 * 2. Applies padding and fit-content sizing for better visual testing
 * 3. Injects global styles to disable CSS transform animations
 * 4. Supports custom width and rootStyle options
 *
 * The wrapper uses only string element types ('div', 'style') because
 * Playwright blocks function components defined in test context.
 * See createPlaywrightJsxObject documentation for details.
 */
export function createComponentWrapper(
    component: React.JSX.Element,
    options?: {
        width?: number | string;
        rootStyle?: React.CSSProperties;
    },
) {
    const { width, rootStyle } = options || {};

    const styleElement = createPlaywrightJsxObject('style', {
        children: '.g-button, .g-button::after { transform: scale(1) !important; }',
    });

    const wrapper = createPlaywrightJsxObject('div', {
        style: {
            padding: 20,
            // When width is set, padding should not affect total width
            boxSizing: width ? 'content-box' : undefined,
            width: width ? width : 'fit-content',
            height: 'fit-content',
            ...rootStyle,
        },
        className: TEST_WRAPPER_CLASS,
        children: [styleElement, component],
    });

    return wrapper;
}
