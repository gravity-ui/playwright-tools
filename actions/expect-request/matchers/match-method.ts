import type { Request } from '@playwright/test';

import { DiffPrinter } from './compare/DiffPrinter';

export function matchMethod(request: Request, method?: string): string | null {
    if (method === undefined) {
        return null;
    }

    const printer = new DiffPrinter({
        left: request.method().toUpperCase(),
        right: method.toUpperCase(),
    });
    return printer.printDiff({ side: 'left' }) || null;
}
