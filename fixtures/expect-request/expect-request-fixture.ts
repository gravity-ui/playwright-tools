import type {
    Fixtures,
    PlaywrightTestArgs,
    PlaywrightTestOptions,
    PlaywrightWorkerArgs,
    PlaywrightWorkerOptions,
    Request,
    TestFixture,
} from '@playwright/test';

import { expectRequest as expectRequestFn } from '../../actions/expect-request';

import type {
    ExpectRequestFixturesBuilderParams,
    ExpectRequestFn,
    ExpectRequestTestArgs,
    ExpectRequestWorkerArgs,
} from './types';

export function expectRequestFixturesBuilder(_params: ExpectRequestFixturesBuilderParams = {}) {
    const expectRequestFixture: TestFixture<
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

    const fixtures: Fixtures<
        ExpectRequestTestArgs,
        ExpectRequestWorkerArgs,
        PlaywrightTestArgs & PlaywrightTestOptions,
        PlaywrightWorkerArgs & PlaywrightWorkerOptions
    > = {
        expectRequest: [expectRequestFixture, { scope: 'test' }],
    };

    return fixtures;
}
