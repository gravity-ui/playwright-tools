// для урла вида https://ya.ru и https://ya.ru/ pathname будет равен '/'
import { normalizePathname } from './normalizePathname';
import type { ExpectedResponse } from './types';

const EMPTY_PATHNAME = '/';

export function isSameResponse(status: number, url: string, baseUrl: string) {
    return (expectedResponse: ExpectedResponse) => {
        const expectedUrl = new URL(expectedResponse.url, baseUrl);
        const failedUrl = new URL(url);

        let result = expectedResponse.status === status && expectedUrl.origin === failedUrl.origin;

        if (result && expectedUrl.pathname !== EMPTY_PATHNAME) {
            result =
                normalizePathname(expectedUrl.pathname) === normalizePathname(failedUrl.pathname);
        }

        return result;
    };
}
