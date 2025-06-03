import { URL } from 'url';

/**
 * Returns the domain for cookies based on the baseURL from the config
 */
export function getCookieDomain(baseURL: string) {
    const parsedBaseUrl = new URL(baseURL);
    const baseHost = parsedBaseUrl.hostname.replace(/:\d+$/, '');
    const domain = '.' + baseHost.split('.').slice(-2).join('.');

    return domain;
}
