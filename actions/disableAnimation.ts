import type { Page } from '@playwright/test';

const styleForDisableAnimation = /* css */ `{
    transition-duration: 1ms !important;
    transition-delay: 0s !important;
    animation-duration: 1ms !important;
    animation-delay: 0s !important;
    animation-iteration-count: 1 !important;
}`;

/**
 * Disables animation in CSS
 *
 * @param page
 * @param allowFor CSS selectors for elements to enable animation for
 */
export function disableAnimations(page: Page, allowFor?: string[]) {
    const selector = allowFor && allowFor.length !== 0 ? `:not(${allowFor.join(',')})` : '*';

    return page.addInitScript(
        ({
            selector,
            styleForDisableAnimation,
        }: {
            selector: string;
            styleForDisableAnimation: string;
        }) => {
            function injectStyles() {
                const style = document.createElement('style');

                style.textContent = selector + styleForDisableAnimation;
                document.head.appendChild(style);
            }

            // Script added via addInitScript runs before DOM is built
            if (document.readyState === 'complete') {
                injectStyles();
            } else {
                document.addEventListener('DOMContentLoaded', () => {
                    injectStyles();
                });
            }
        },
        { selector, styleForDisableAnimation },
    );
}
