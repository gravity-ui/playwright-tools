import { URL } from 'url';

/**
 * Возвращает домен для кук на основе baseURL из конфига
 */
export function getCookieDomain(baseURL: string) {
    const parsedBaseUrl = new URL(baseURL);
    const baseHost = parsedBaseUrl.hostname.replace(/:\d+$/, '');
    const domain = '.' + baseHost.split('.').slice(-2).join('.');

    return domain;
}
