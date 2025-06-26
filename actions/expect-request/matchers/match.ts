import type { Json } from '../types';

import { compare } from './compare';
import type { CommonMatcherOptions } from './types';

export function match(actual: Json, expected: Json, options: CommonMatcherOptions) {
    const { exact } = options;

    const diffLog = compare({ left: actual, right: expected, exactArrays: exact });
    const diffLogForActual = diffLog.filter(({ side }) => side === 'left');

    return exact ? diffLog.length === 0 : diffLogForActual.length === 0;
}
