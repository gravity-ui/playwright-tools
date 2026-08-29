import { randomUUID } from 'node:crypto';

import type { BrowserContext, Page, Route } from '@playwright/test';

import type { Header, LocalUtilsHarLookupParams, LocalUtilsHarLookupResult } from '../types';
import { HarBackend } from '../vendor/harBackend';

import { degrade } from './diagnostics';
import { getHarTransforms } from './transformRegistry';

export type HarReplayOptions = {
    /**
     * Behavior mode for requests not found in the archive
     * @defaultValue `'abort'`
     */
    notFound?: 'abort' | 'fallback';

    /**
     * Request URL pattern to be processed
     */
    url?: string | RegExp;
};

type RouteWithRedirect = Route & {
    _redirectNavigationRequest?: (url: string) => Promise<void>;
};

/**
 * `route.fulfill` takes a headers object, so repeated headers must be folded into
 * one key. Playwright's own HAR router folds with `Object.fromEntries`, which drops
 * every `set-cookie` but the last; joining them with a newline instead keeps all of
 * them, because the Chromium and Firefox fulfill paths split that value back apart.
 */
function toFulfillHeaders(headers: Header[]): Record<string, string> {
    const result: Record<string, string> = {};

    for (const { name, value } of headers) {
        if (name.toLowerCase() !== 'set-cookie') {
            result[name] = value;

            continue;
        }

        const existing = result['set-cookie'];

        result['set-cookie'] = existing === undefined ? value : `${existing}\n${value}`;
    }

    return result;
}

async function handleRoute(
    route: Route,
    backend: HarBackend,
    harId: string,
    notFound: 'abort' | 'fallback',
) {
    const { lookupParams, lookupResult } = getHarTransforms();
    const request = route.request();

    let params: LocalUtilsHarLookupParams = {
        harId,
        url: request.url(),
        method: request.method(),
        headers: await request.headersArray(),
        postData: request.postDataBuffer() ?? undefined,
        isNavigationRequest: request.isNavigationRequest(),
    };

    if (lookupParams) {
        params = lookupParams(params);
    }

    let result: LocalUtilsHarLookupResult = await backend.lookup(
        params.url,
        params.method,
        params.headers,
        params.postData,
        params.isNavigationRequest,
    );

    if (lookupResult) {
        result = await lookupResult(result, params);
    }

    if (result.action === 'redirect' && result.redirectURL) {
        const redirectNavigationRequest = (route as RouteWithRedirect)._redirectNavigationRequest;

        if (typeof redirectNavigationRequest === 'function') {
            await redirectNavigationRequest.call(route, result.redirectURL);

            return;
        }

        degrade(
            'no-navigation-redirect',
            'Route._redirectNavigationRequest is unavailable in this Playwright version. ' +
                'Recorded navigation redirects are replayed in place: the response body is ' +
                'correct, but page.url() keeps the pre-redirect URL.',
        );

        result = await backend.lookup(
            result.redirectURL,
            params.method,
            params.headers,
            params.postData,
            false,
        );
    }

    if (result.action === 'fulfill') {
        // A recorded request that never completed. Playwright stalls it forever.
        if (result.status === -1) {
            return;
        }

        await route.fulfill({
            status: result.status,
            headers: toFulfillHeaders(result.headers ?? []),
            body: result.body,
        });

        return;
    }

    if (result.action === 'error') {
        degrade('har-lookup-error', result.message ?? 'unknown HAR lookup error');
    }

    if (notFound === 'abort') {
        await route.abort();

        return;
    }

    await route.fallback();
}

/**
 * Replays a HAR file through the public routing API, without touching any
 * Playwright internals.
 */
export async function installHarReplay(
    target: Page | BrowserContext,
    file: string,
    { notFound = 'abort', url }: HarReplayOptions = {},
): Promise<void> {
    const backend = await HarBackend.open(file);
    const harId = randomUUID();
    const { open } = getHarTransforms();

    if (open) {
        open(backend.harFile);
    }

    const handler = (route: Route) => handleRoute(route, backend, harId, notFound);

    // `Page.route` and `BrowserContext.route` have the same shape here.
    await (target as BrowserContext).route(url ?? '**/*', handler);
}
