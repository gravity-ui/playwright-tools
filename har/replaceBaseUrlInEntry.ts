import escapeStringRegExp from 'escape-string-regexp';

import type { Entry, Header } from './types';

/**
 * Replaces the base URL in the HAR file request entry
 *
 * @param entry Recording from HAR file
 * @param fromUrl URL to replace
 * @param toUrl URL to replace with
 */
export function replaceBaseUrlInEntry(entry: Entry, fromUrl: string, toUrl: string) {
    const fromUrlRegExp = new RegExp(escapeStringRegExp(fromUrl), 'g');

    // eslint-disable-next-line no-param-reassign
    entry.request.url = entry.request.url.replace(fromUrl, toUrl);

    if (entry.response.redirectURL) {
        entry.response.redirectURL.replace(fromUrl, toUrl);
    }

    const replaceBaseUrlInHeaders = (headers: Header[]) => {
        for (const header of headers) {
            header.value = header.value.replace(fromUrlRegExp, toUrl);
        }
    };

    replaceBaseUrlInHeaders(entry.request.headers);
    replaceBaseUrlInHeaders(entry.response.headers);
}
