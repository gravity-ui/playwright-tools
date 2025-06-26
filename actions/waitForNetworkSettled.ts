// https://gist.github.com/dgozman/d1c46f966eb9854ee1fe24960b603b28

import type { Page } from '@playwright/test';

import { globalSettings } from '../data/globalSettings';

function getDeferredPromise() {
    let resolveFn!: VoidFunction;
    const promise: Promise<void> = new Promise<void>((resolve) => {
        resolveFn = resolve;
    });

    return { promise, resolve: resolveFn };
}

/**
 * Count page requests after performing given `action`, and resolves after all requests finished
 */
export async function waitForNetworkSettled(
    page: Page,
    action: () => Promise<void>,
    { networkSettleDelay = globalSettings.waitForNetworkSettled.delay } = {},
) {
    const { resolve: networkSettledCallback, promise: networkSettledPromise } =
        getDeferredPromise();

    let requestCounter = 0;
    let actionDone = false;

    const maybeSettle = () => {
        if (actionDone && requestCounter <= 0) {
            networkSettledCallback();
        }
    };

    const onRequest = () => {
        ++requestCounter;
    };

    const onRequestDone = () => {
        void page
            .evaluate(
                (timeout) => new Promise((resolve) => setTimeout(resolve, timeout)),
                networkSettleDelay,
            )
            .catch(() => null)
            .then(() => {
                --requestCounter;
                maybeSettle();
            });
    };

    page.on('request', onRequest);
    page.on('requestfinished', onRequestDone);
    page.on('requestfailed', onRequestDone);

    const result = await action();
    actionDone = true;
    maybeSettle();

    await networkSettledPromise;

    page.removeListener('request', onRequest);
    page.removeListener('requestfinished', onRequestDone);
    page.removeListener('requestfailed', onRequestDone);

    return result;
}
