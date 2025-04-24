import type { Request } from '@playwright/test';

import type { Json } from '../types';

import { DiffPrinter } from './compare/DiffPrinter';
import type { CommonMatcherOptions } from './types';

export function matchBody(
    request: Request,
    body: Json | undefined,
    { exact }: CommonMatcherOptions,
): string | null {
    if (!body) {
        return null;
    }

    const requestBody = request.postDataJSON();

    const printer = new DiffPrinter({ left: requestBody, right: body });
    return printer.printDiff({ side: 'left', exact }) || null;
}
