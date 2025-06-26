import type { ConsoleMessage, Page, Response } from '@playwright/test';

import { globalSettings } from '../../data/globalSettings';

import { isSameMessage } from './isSameMessage';
import { isSameResponse } from './isSameResponse';
import type { Config, ExpectedMessage, ResponseFailure } from './types';

const STUB_HOSTNAME = 'https://stub';

export function collectPageActivity(page: Page, config: Config) {
    const {
        ignoredMessageTypes = globalSettings.collectPageActivity.ignoredMessageTypes,
        expectedMessages = globalSettings.collectPageActivity.expectedMessages,
        ignoredResponseStatuses = globalSettings.collectPageActivity.ignoredResponseStatuses,
        expectedResponses = globalSettings.collectPageActivity.expectedResponses,
        requestIdHeader = globalSettings.collectPageActivity.requestIdHeader,
    } = config;

    const uncaughtErrors: Error[] = [];
    const pageCrashes: Page[] = [];
    const unexpectedMessages: ExpectedMessage[] = [];
    const failedResponses: ResponseFailure[] = [];

    const handlePageError = (error: Error) => uncaughtErrors.push(error);
    page.on('pageerror', handlePageError);

    const handleCrash = (error: Page) => pageCrashes.push(error);
    page.on('crash', handleCrash);

    const handleConsole = (message: ConsoleMessage) => {
        const type = message.type();
        const text = message.text();

        if (
            !ignoredMessageTypes.includes(type) &&
            !expectedMessages.some(isSameMessage(type, text))
        ) {
            unexpectedMessages.push({ text, type });
        }
    };
    page.on('console', handleConsole);

    const handleResponse = (response: Response) => {
        const status = response.status();
        const url = response.url();
        let redirect = response.headers()['location'];

        // If the request has a relative location,
        // then we substitute the origin of the original request for it.
        // For example, on the example.com page, the request https://example.com/watch/123456?...,
        // with location = /watch/654321?...,
        // will be compared as https://example.com/watch/654321?...

        if (redirect) {
            const { origin: redirectOrigin } = new URL(redirect, STUB_HOSTNAME);
            if (redirectOrigin === STUB_HOSTNAME) {
                const { origin: currentOrigin } = new URL(url);
                const { href: newRedirect } = new URL(redirect, currentOrigin);
                redirect = newRedirect;
            }
        }

        const resultUrl = redirect || url;

        if (
            !ignoredResponseStatuses.includes(status) &&
            !expectedResponses.some(isSameResponse(status, resultUrl, config.baseUrl))
        ) {
            const result: ResponseFailure = { status, url: resultUrl };

            if (redirect) {
                result.originalUrl = url;
            }

            const requestId = response.headers()[requestIdHeader];

            if (requestId) {
                result.requestId = requestId;
            }

            failedResponses.push(result);
        }
    };
    page.on('response', handleResponse);

    const unsubscribe = () => {
        page.off('pageerror', handlePageError);
        page.off('crash', handleCrash);
        page.off('console', handleConsole);
        page.off('response', handleResponse);
    };

    return {
        unsubscribe,
        results: {
            uncaughtErrors,
            pageCrashes,
            unexpectedMessages,
            failedResponses,
        },
    };
}
