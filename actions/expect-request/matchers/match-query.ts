import { URLSearchParams } from 'node:url';

import type { Request } from '@playwright/test';

import { DiffPrinter } from './compare/DiffPrinter';
import type { CommonMatcherOptions } from './types';

export function matchQuery(
    request: Request,
    query: string | Record<string, string | string[]> | undefined,
    { exact }: CommonMatcherOptions,
): string | null {
    if (!query) {
        return null;
    }

    const requestSearchParams = new URL(request.url()).searchParams;
    const querySearchParams = new URLSearchParams(query);

    const requestEntries = searchParamsToObject(requestSearchParams);
    const queryEntries = searchParamsToObject(querySearchParams);

    const printer = new DiffPrinter({ left: requestEntries, right: queryEntries });
    return printer.printDiff({ side: 'left', exact }) || null;
}

function searchParamsToObject(searchParams: URLSearchParams): Record<string, string | string[]> {
    const result: Record<string, string | string[]> = {};

    const entries = searchParams.entries();

    for (const [key, value] of entries) {
        if (result[key]) {
            if (Array.isArray(result[key])) {
                result[key].push(value);
            } else {
                result[key] = [result[key], value];
            }
        } else {
            result[key] = value;
        }
    }

    return result;
}
