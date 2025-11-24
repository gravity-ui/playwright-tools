// For URLs like https://example.com and https://example.com/ pathname will be equal to '/'
import { normalizePathname } from './normalizePathname';
import type { ExpectedResponse } from './types';

const EMPTY_PATHNAME = '/';

export function isSameResponse(status: number, url: string, baseUrl: string) {
    return (expectedResponse: ExpectedResponse) => {
        const expectedUrl =
            typeof expectedResponse.url === 'string'
                ? new URL(expectedResponse.url, baseUrl)
                : expectedResponse.url;
        const failedUrl = new URL(url);

        let result = expectedResponse.status === status;

        if (result) {
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
