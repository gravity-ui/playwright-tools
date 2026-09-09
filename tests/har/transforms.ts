import { readFile } from 'node:fs/promises';

import { expect } from '@playwright/test';

import type {
    Entry,
    HARFile,
    LocalUtilsHarLookupParams,
    LocalUtilsHarLookupResult,
} from '../../har';
import {
    addFlushTransform,
    addHarLookupTransform,
    addHarOpenTransform,
    addHarRecorderTransform,
    clearHeaders,
    replaceBaseUrlInEntry,
} from '../../har';
import { readZipEntries } from '../../har/vendor/zip';

import playwrightTestPackage from '@playwright/test/package.json';

export const PLACEHOLDER = 'https://base.url.placeholder';
export const MARKER_HEADER = 'x-recorded-by-transform';
export const PATCHED_BODY = JSON.stringify({ payload: 'PATCHED' });

export const expectedTier =
    playwrightTestPackage.version.startsWith('1.') &&
    Number(playwrightTestPackage.version.split('.')[1]) < 60
        ? 'legacy'
        : 'public-api';

export type Calls = {
    recorder: number;
    flush: number;
    open: number;
    lookupParams: number;
    lookupResult: number;
};

const calls: Calls = { recorder: 0, flush: 0, open: 0, lookupParams: 0, lookupResult: 0 };

let baseURL = '';

/** The transforms read the origin lazily, so every spec file sets its own. */
export function setBaseURL(url: string): void {
    baseURL = url;
}

export function snapshotCalls(): Calls {
    return { ...calls };
}

export function callsSince(before: Calls): Calls {
    return {
        recorder: calls.recorder - before.recorder,
        flush: calls.flush - before.flush,
        open: calls.open - before.open,
        lookupParams: calls.lookupParams - before.lookupParams,
        lookupResult: calls.lookupResult - before.lookupResult,
    };
}

// Registered once per worker process, exactly the way a consumer does it from a
// module-level `playwrightPatches()`. Every spec file of the suite imports this
// module, so the registration happens whichever file the worker starts with.
addHarRecorderTransform((entry: Entry) => {
    calls.recorder++;

    // eslint-disable-next-line no-param-reassign -- transforms mutate the entry in place
    entry.request.headers = clearHeaders(entry.request.headers, {
        removeHeaders: new Set(['cookie']),
    });
    // eslint-disable-next-line no-param-reassign -- transforms mutate the entry in place
    entry.response.headers = clearHeaders(entry.response.headers, {
        removeHeaders: new Set(['set-cookie']),
    });
    entry.response.headers.push({ name: MARKER_HEADER, value: '1' });

    replaceBaseUrlInEntry(entry, baseURL, PLACEHOLDER);
});

addFlushTransform((entries: Entry[]) => {
    calls.flush++;

    return entries.filter((entry) => entry.time !== -1);
});

addHarOpenTransform((harFile: HARFile) => {
    calls.open++;

    for (const entry of harFile.log.entries) {
        replaceBaseUrlInEntry(entry, PLACEHOLDER, baseURL);
    }
});

addHarLookupTransform(
    (params: LocalUtilsHarLookupParams) => {
        calls.lookupParams++;

        return params;
    },
    (result: LocalUtilsHarLookupResult, params: LocalUtilsHarLookupParams) => {
        calls.lookupResult++;

        if (result.action === 'fulfill' && params.url.endsWith('/api')) {
            return { ...result, body: Buffer.from(PATCHED_BODY, 'utf8') };
        }

        return result;
    },
);

export async function readDump(file: string): Promise<HARFile> {
    if (!file.endsWith('.zip')) {
        return JSON.parse(await readFile(file, 'utf8')) as HARFile;
    }

    const members = await readZipEntries(file);
    const harName = [...members.keys()].find((name) => name.endsWith('.har'));

    if (harName === undefined) {
        throw new Error(`No .har member in ${file}`);
    }

    return JSON.parse(members.get(harName)!.toString('utf8')) as HARFile;
}

export type ScrubOptions = {
    /**
     * On Playwright 1.23–1.59 the per-entry hook can run for a redirect entry
     * before the tracer has finished it: `response.redirectURL` is assigned when
     * the follow-up request starts and the response headers can be replaced
     * afterwards. The live origin can survive in `redirectURL` and the marker the
     * hook added can be lost, for redirect entries only.
     */
    legacyRedirects?: boolean;
};

function isRedirect(entry: Entry): boolean {
    return entry.response.status >= 300 && entry.response.status < 400;
}

/**
 * The record-side transforms landed in the file that was actually written:
 * nothing of the live origin, no cookies, and the marker on every response.
 */
export function expectScrubbed(
    har: HARFile,
    realOrigin: string,
    { legacyRedirects = false }: ScrubOptions = {},
): void {
    const complete = legacyRedirects
        ? har.log.entries.filter((entry) => !isRedirect(entry))
        : har.log.entries;

    expect(har.log.entries.length).toBeGreaterThan(0);
    expect(har.log.entries.every((entry) => entry.request.url.startsWith(PLACEHOLDER))).toBe(true);
    expect(
        har.log.entries.flatMap((entry) =>
            entry.response.headers.filter((header) => header.name.toLowerCase() === 'set-cookie'),
        ),
    ).toStrictEqual([]);
    expect(complete.length).toBeGreaterThan(0);
    expect(
        complete.every((entry) =>
            entry.response.headers.some((header) => header.name === MARKER_HEADER),
        ),
    ).toBe(true);
    expect(
        JSON.stringify(har, (key, value: unknown) =>
            legacyRedirects && key === 'redirectURL' ? undefined : value,
        ),
    ).not.toContain(realOrigin);
}
