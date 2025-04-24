import type {
    PlaywrightTestArgs,
    PlaywrightTestOptions,
    Request,
    TestFixture,
} from '@playwright/test';

import { expectRequest as expectRequestFn } from '../../actions/expect-request';

import type { ExpectRequestFn } from './types';

export const expectRequestFixture: TestFixture<
    ExpectRequestFn,
    PlaywrightTestOptions & PlaywrightTestArgs
> = async ({ page, baseURL }, use) => {
    if (!baseURL) {
        throw new Error('Base URL required for requests matching!');
    }

    const requests = new Map<string, Request>();

    page.on('request', (request) => {
        const url = new URL(request.url());
        const key = `${url.protocol}//${url.hostname}${url.pathname}`;

        requests.set(key, request);
    });

    const boundExpectRequest = expectRequestFn.bind(null, requests);

    await use(boundExpectRequest);

    requests.clear();
};

const fixtureOptions = {
    scope: 'test',
} as const;

export const expectRequest: [typeof expectRequestFixture, typeof fixtureOptions] = [
    expectRequestFixture,
    fixtureOptions,
];
