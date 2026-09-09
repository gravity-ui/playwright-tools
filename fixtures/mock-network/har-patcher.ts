import {
    type Entry,
    type HARFile,
    type LocalUtilsHarLookupParams,
    type LocalUtilsHarLookupResult,
    clearHeaders,
    replaceBaseUrlInEntry,
} from '../../har';
import { setFixtureHarTransforms } from '../../har/engine/transformRegistry';
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

    // The fixture runs once per test, so its transforms are registered as fixture
    // transforms: they replace the previous test's ones instead of being latched
    // for the whole worker process the way the add*Transform functions are.
    const recorder = (entry: Entry) => {
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
    };

    const open = (harFile: HARFile) => {
        const entries = harFile.log.entries;

        for (const entry of entries) {
            replaceBaseUrlInEntry(entry, baseUrlPLaceholder, baseURL);
            onHarEntryWillRead?.(entry, baseURL);
        }
    };

    // Create duplicate ID transformer once to preserve state between calls
    const duplicateIdTransform = shouldMarkIdenticalRequests ? createDuplicateIdTransform() : null;

    const onTransformHarLookupParamsFinal = (params: LocalUtilsHarLookupParams) => {
        // Apply duplicate ID transform first (if enabled)
        const modifiedParams = duplicateIdTransform ? duplicateIdTransform(params) : params;

        // Then apply custom transformer (if provided)
        return onTransformHarLookupParams
            ? onTransformHarLookupParams(modifiedParams, baseURL)
            : modifiedParams;
    };

    const onTransformHarLookupResultFinal = (
        result: LocalUtilsHarLookupResult,
        params: LocalUtilsHarLookupParams,
    ) => {
        return onTransformHarLookupResult
            ? onTransformHarLookupResult(result, params, baseURL)
            : result;
    };

    // Transform requests before writing to har file
    const flush = (entries: Entry[]) => {
        // Before writing to har file, filter out canceled requests
        const filteredEntries = entries.filter((entry: Entry) => entry.time !== -1);

        // Add x-tests-duplicate-id header for identical requests (if enabled)
        if (shouldMarkIdenticalRequests) {
            return markIdenticalRequests(filteredEntries);
        }

        return filteredEntries;
    };

    setFixtureHarTransforms({
        recorder,
        open,
        lookupParams: onTransformHarLookupParamsFinal,
        lookupResult: onTransformHarLookupResultFinal,
        flush,
    });
}
