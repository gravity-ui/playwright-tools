import type { Header } from './types';

export type ClearHeadersOptions = {
    removeHeaders?: Set<string>;
    removeSetCookieFor?: Set<string>;
};

/**
 * Чистит указанные заголовки
 *
 * Удобно использовать в `addHarRecorderTransform` для удаления приватных заголовков и кук.
 */
export function clearHeaders(
    headers: Header[],
    { removeHeaders, removeSetCookieFor }: ClearHeadersOptions,
) {
    const nextHeaders: Header[] = [];

    for (const header of headers) {
        const name = header.name.toLowerCase();

        if (removeHeaders?.has(name)) {
            continue;
        }

        if (name === 'set-cookie' && removeSetCookieFor) {
            const cookieName = header.value.split('=', 1)[0];

            if (cookieName && removeSetCookieFor.has(cookieName)) {
                continue;
            }
        }

        nextHeaders.push(header);
    }

    return nextHeaders;
}
