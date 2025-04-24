import type { Request } from '@playwright/test';

import { matchBody } from './matchers/match-body';
import { matchMethod } from './matchers/match-method';
import { matchQuery } from './matchers/match-query';
import { matchUrl } from './matchers/match-url';
import { pollWithTimeout } from './poll-with-timeout';
import type { ExpectRequestFnMatcher, ExpectRequestFnOptions } from './types';

export async function expectRequest(
    requests: Map<string, Request>,
    url: string | RegExp,
    matcher: ExpectRequestFnMatcher = {},
    options: ExpectRequestFnOptions = {},
) {
    const { method, query, body } = matcher;
    const { timeout, exact = false } = options;

    let methodDiff: string | null = null;
    let bodyDiff: string | null = null;
    let queryDiff: string | null = null;
    let isRequestMade = false;

    await pollWithTimeout({
        callbackFn: async () => {
            for (const [requestUrl, request] of requests.entries()) {
                if (!matchUrl(requestUrl, url)) {
                    continue;
                }

                isRequestMade = true;

                methodDiff = matchMethod(request, method);
                bodyDiff = matchBody(request, body, { exact });
                queryDiff = matchQuery(request, query, { exact });

                if (!(methodDiff || bodyDiff || queryDiff)) {
                    return true;
                }
            }

            return false;
        },
        condition: (result) => result,
        timeout,
        onTimeout: ({ resolve }) => {
            resolve(true);
        },
    });

    if (!isRequestMade) {
        throw new Error('Asserted request was not made.');
    }

    const diffMessage = makeDiffMessage({ methodDiff, queryDiff, bodyDiff });
    if (diffMessage) {
        throw new Error(diffMessage);
    }
}

function makeDiffMessage(params: {
    methodDiff: string | null;
    queryDiff: string | null;
    bodyDiff: string | null;
}): string | null {
    const { methodDiff, queryDiff, bodyDiff } = params;

    if (!(methodDiff || queryDiff || bodyDiff)) {
        return null;
    }

    const message: string[] = ['\n\n- Expected\n+ Received'];

    if (methodDiff) {
        message.push(`Request method match:\n\n${methodDiff}`);
    }
    if (queryDiff) {
        message.push(`Request query match:\n\n${queryDiff}`);
    }
    if (bodyDiff) {
        message.push(`Request body match:\n\n${bodyDiff}`);
    }

    return message.join('\n\n\n');
}
