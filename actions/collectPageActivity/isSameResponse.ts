import { getURL } from './getURL';
import { normalizePathname } from './normalizePathname';
import type { ExpectedResponse } from './types';

const EMPTY_PATHNAME = '/';

export function isSameResponse(status: number, url: string, baseUrl: string) {
    return (expectedResponse: ExpectedResponse) => {
        const expectedUrl =
            typeof expectedResponse.url === 'string'
                ? getURL(expectedResponse.url, baseUrl)
                : expectedResponse.url;

        let result = expectedResponse.status === status;

        if (result) {
            const failedUrl = getURL(url);

            if (expectedUrl instanceof RegExp) {
                result = expectedUrl.test(failedUrl.href);
            } else {
                result = expectedUrl.origin === failedUrl.origin;

                if (result && expectedUrl.pathname !== EMPTY_PATHNAME) {
                    result =
                        normalizePathname(expectedUrl.pathname) ===
                        normalizePathname(failedUrl.pathname);
                }
            }
        }

        return result;
    };
}
