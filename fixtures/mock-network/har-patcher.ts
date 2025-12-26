import {
    type Entry,
    type LocalUtilsHarLookupParams,
    type LocalUtilsHarLookupResult,
    addFlushTransform,
    addHarLookupTransform,
    addHarOpenTransform,
    addHarRecorderTransform,
    clearHeaders,
    replaceBaseUrlInEntry,
} from '../../har';
import { createDuplicateIdTransform } from '../../utils/createDuplicateIdTransform';
import { markIdenticalRequests } from '../../utils/markIdenticalRequests';

import type { MockNetworkFixtureBuilderParams } from './types';

const DEFAULT_REMOVE_HEADERS = new Set([
    'cookie',
    'x-csrf-token',
    'content-security-policy',
    'Session_id',
]);
const DEFAULT_REMOVE_SET_COOKIE_FOR = new Set(['CSRF-TOKEN']);

const baseUrlPLaceholder = 'https://base.url.placeholder';

export type HarPatcherParams = Pick<
    MockNetworkFixtureBuilderParams,
    | 'headersToRemove'
    | 'setCookieToRemove'
    | 'onHarEntryWillRead'
    | 'onHarEntryWillWrite'
    | 'onTransformHarLookupParams'
    | 'onTransformHarLookupResult'
    | 'shouldMarkIdenticalRequests'
> & {
    /**
     * Base url of the test
     */
    baseURL: string;
};

export function harPatcher({
    baseURL,

    headersToRemove: additionalHeadersToRemove = [],
    setCookieToRemove: additionalSetCookieToRemove = [],

    onHarEntryWillWrite,
    onHarEntryWillRead,

    onTransformHarLookupParams,
    onTransformHarLookupResult,

    shouldMarkIdenticalRequests = false,
}: HarPatcherParams) {
    const headersToRemove = new Set([...DEFAULT_REMOVE_HEADERS, ...additionalHeadersToRemove]);
    const setCookieToRemove = new Set([
        ...DEFAULT_REMOVE_SET_COOKIE_FOR,
        ...additionalSetCookieToRemove,
    ]);

    addHarRecorderTransform((entry) => {
        // eslint-disable-next-line no-param-reassign
        entry.request.headers = clearHeaders(entry.request.headers, {
            removeHeaders: headersToRemove,
        });
        // eslint-disable-next-line no-param-reassign
        entry.response.headers = clearHeaders(entry.response.headers, {
            removeHeaders: headersToRemove,
            removeSetCookieFor: setCookieToRemove,
        });

        replaceBaseUrlInEntry(entry, baseURL, baseUrlPLaceholder);

        onHarEntryWillWrite?.(entry, baseURL);
    });

    addHarOpenTransform((harFile) => {
        const entries = harFile.log.entries;

        for (const entry of entries) {
            replaceBaseUrlInEntry(entry, baseUrlPLaceholder, baseURL);
            onHarEntryWillRead?.(entry, baseURL);
        }
    });

    addHarLookupTransform(
        onTransformHarLookupParams
            ? (params) => onTransformHarLookupParams(params, baseURL)
            : undefined,
        onTransformHarLookupResult
            ? (result, params) => onTransformHarLookupResult(result, params, baseURL)
            : undefined,
    );

    // Filter out canceled requests before writing to har file
    addFlushTransform((entries) => entries.filter((entry: Entry) => entry.time !== -1));

    // Automatic marking of identical requests during replay (if enabled)
    if (shouldMarkIdenticalRequests) {
        const duplicateIdTransform = createDuplicateIdTransform();

        // Combine our transformer with the custom one (if any)
        const onTransformHarLookupParamsResult = onTransformHarLookupParams
            ? (params: LocalUtilsHarLookupParams) => {
                  // First apply our transformer
                  const paramsWithDuplicateId = duplicateIdTransform(params);
                  // Then apply the custom one
                  return onTransformHarLookupParams(paramsWithDuplicateId, baseURL);
              }
            : duplicateIdTransform;

        const onTransformHarLookupResultResult = onTransformHarLookupResult
            ? (result: LocalUtilsHarLookupResult, params: LocalUtilsHarLookupParams) =>
                  onTransformHarLookupResult(result, params, baseURL)
            : undefined;

        addHarLookupTransform(onTransformHarLookupParamsResult, onTransformHarLookupResultResult);
    } else {
        // If marking is disabled, but there are custom transformers - apply them
        addHarLookupTransform(
            onTransformHarLookupParams
                ? (params) => onTransformHarLookupParams(params, baseURL)
                : undefined,
            onTransformHarLookupResult
                ? (result, params) => onTransformHarLookupResult(result, params, baseURL)
                : undefined,
        );
    }

    // Transform requests before writing to har file
    addFlushTransform((entries) => {
        // Before writing to har file, filter out canceled requests
        const filteredEntries = entries.filter((entry: Entry) => entry.time !== -1);

        // Add x-tests-duplicate-id header for identical requests (if enabled)
        if (shouldMarkIdenticalRequests) {
            return markIdenticalRequests(filteredEntries);
        }

        return filteredEntries;
    });
}
