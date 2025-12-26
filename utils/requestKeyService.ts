import type { Entry, Header, LocalUtilsHarLookupParams, QueryParameter } from '../har';

/**
 * Creates a unique request key based on its parameters.
 * Used to identify identical requests when working with HAR files.
 *
 * The key is formed based on:
 * - HTTP method
 * - URL (without query parameters)
 * - Query parameters (sorted)
 * - Headers (sorted, excluding service headers)
 */
export function createRequestKey(params: RequestKeyParams): string {
    const method = params.method;
    const url = params.url;

    // Parse URL to extract the base part and query parameters
    const urlObj = new URL(url);

    // Get sorted query parameters
    const sortedQueryString = params.queryString
        ? sortQueryStringFromArray(params.queryString)
        : sortQueryStringFromUrl(urlObj);

    // Get sorted headers (excluding service headers)
    const sortedHeaders = sortHeaders(params.headers);

    // Form the key: method + URL without query + query parameters + headers
    return `${method}:${urlObj.origin}${urlObj.pathname}:${sortedQueryString}:${sortedHeaders}`;
}

/**
 * Parameters for creating a request key
 */
type RequestKeyParams = {
    method: string;
    url: string;
    headers: Header[];
    queryString?: QueryParameter[];
};

/**
 * Creates a key from Entry (when writing HAR)
 */
export function createRequestKeyFromEntry(entry: Entry): string {
    return createRequestKey({
        method: entry.request.method,
        url: entry.request.url,
        headers: entry.request.headers,
        queryString: entry.request.queryString,
    });
}

/**
 * Creates a key from LocalUtilsHarLookupParams (when replaying)
 */
export function createRequestKeyFromLookupParams(params: LocalUtilsHarLookupParams): string {
    return createRequestKey({
        method: params.method,
        url: params.url,
        headers: params.headers,
        // queryString is automatically extracted from URL
    });
}

/**
 * Sorts query parameters from QueryParameter array
 */
function sortQueryStringFromArray(queryString: QueryParameter[]): string {
    return [...queryString]
        .sort((a, b) => a.name.localeCompare(b.name))
        .map((queryParameter) => `${queryParameter.name}=${queryParameter.value}`)
        .join('&');
}

/**
 * Sorts query parameters from URL
 */
function sortQueryStringFromUrl(urlObj: URL): string {
    return Array.from(urlObj.searchParams.entries())
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([key, value]) => `${key}=${value}`)
        .join('&');
}

/**
 * Sorts headers, excluding service headers
 */
function sortHeaders(headers: Header[]): string {
    return [...headers]
        .filter((header) => header.name.toLowerCase() !== 'x-tests-duplicate-id')
        .sort((a, b) => a.name.localeCompare(b.name))
        .map((header) => `${header.name.toLowerCase()}:${header.value}`)
        .join('|');
}
