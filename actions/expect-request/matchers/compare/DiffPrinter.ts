import type { Json } from '../../types';

import { compare } from './compare';
import { printJsonDiff } from './print-json-diff';
import type { DiffContextItem, DiffLog, PathAnnotation } from './constants';
import { DiffType, PathAnnotationType } from './constants';

interface DiffPrinterParams {
    left: Json;
    right: Json;
}

export class DiffPrinter {
    private left: Json;
    private right: Json;

    constructor({ left, right }: DiffPrinterParams) {
        this.left = left;
        this.right = right;
    }

    printDiff(params: { side: 'left' | 'right'; exact?: boolean }) {
        const { side, exact } = params;

        const diffLog = compare({ left: this.left, right: this.right, exactArrays: exact });
        const filteredLog = diffLog.reduce<DiffLog>((acc, logItem) => {
            if (logItem.side === side) {
                acc.push(logItem);
            } else if (exact && logItem.type === DiffType.ObjectMissingProperty) {
                acc.push({
                    type: DiffType.ValueMismatch,
                    received: logItem.expected.value,
                    side,
                    context: [...logItem.context, { objectField: logItem.expected.key }],
                });
            }

            return acc;
        }, []);

        if (!filteredLog.length) {
            return '';
        }

        const pathAnnotations = filteredLog.reduce<Record<string, PathAnnotation[]>>(
            (acc, logItem) => {
                const { context, type } = logItem;
                const path = this.makePathFromContext(context);

                if (!acc[path]) {
                    /* eslint-disable no-return-assign, no-param-reassign */
                    acc[path] = [];
                }

                if (type === DiffType.ValueMismatch) {
                    if (logItem.expected === undefined && logItem.received !== undefined) {
                        acc[path].push({ type: PathAnnotationType.ObjectExtraProperty });
                    } else {
                        acc[path].push({
                            type: PathAnnotationType.ValueMismatch,
                            expected: logItem.expected,
                            received: logItem.received,
                        });
                    }
                } else if (type === DiffType.ObjectMissingProperty) {
                    acc[path].push({
                        type: PathAnnotationType.ObjectMissingProperty,
                        expected: logItem.expected,
                    });
                } else if (type === DiffType.ArrayMissingValue) {
                    acc[path].push({
                        type: PathAnnotationType.ArrayMissingValue,
                        expected: logItem.expected,
                    });
                }

                return acc;
            },
            {},
        );

        return printJsonDiff({ json: side === 'left' ? this.left : this.right, pathAnnotations });
    }

    private makePathFromContext(context: DiffContextItem[]) {
        return context
            .map<string>(({ objectField, arrayIndex }) => {
                if (arrayIndex !== undefined) {
                    return `[${arrayIndex}]`;
                }

                return `${objectField}`;
            })
            .join('.');
    }
}
