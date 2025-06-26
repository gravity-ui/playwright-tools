/* eslint-disable complexity */
import type { Json, JsonObject } from '../../types';
import { isObject } from '../utils';

import { DiffLogger } from './DiffLogger';
import { DiffType } from './constants';

export function compare(params: { left: Json; right: Json; exactArrays?: boolean }) {
    const { left, right, exactArrays } = params;

    const logger = new DiffLogger();

    compareInner({
        left,
        right,
        exactArrays,
        logger: logger,
    });

    compareInner({
        left: right,
        right: left,
        forwardComparison: false,
        exactArrays,
        logger: logger,
    });

    return logger.diffLog;
}

function compareInner(params: {
    left: Json;
    right: Json;
    forwardComparison?: boolean;
    exactArrays?: boolean;
    logger?: DiffLogger;
}): DiffLogger {
    const { left, right, exactArrays, logger, forwardComparison = true } = params;

    const innerLogger = logger ? logger : new DiffLogger();

    if (left === right) {
        return innerLogger;
    }

    if (left === null) {
        innerLogger.addDiffItem({
            type: DiffType.ValueMismatch,
            side: forwardComparison ? 'left' : 'right',
            expected: right,
            received: left,
        });

        return innerLogger;
    }

    if (Array.isArray(left) && Array.isArray(right)) {
        if (exactArrays) {
            if (left.length === right.length) {
                for (let i = 0; i < left.length; ++i) {
                    const leftItem = left[i] ?? null;
                    const rightItem = right[i] ?? null;

                    innerLogger.addContext({ arrayIndex: i });
                    compareInner({
                        left: leftItem,
                        right: rightItem,
                        forwardComparison: forwardComparison,
                        exactArrays,
                        logger: innerLogger,
                    });
                    innerLogger.removeContext();
                }
            } else {
                innerLogger.addDiffItem({
                    type: DiffType.ValueMismatch,
                    side: forwardComparison ? 'left' : 'right',
                    expected: right,
                    received: left,
                });
            }
        } else {
            const rightCopy = [...right];

            for (const leftItem of left) {
                const index = rightCopy.findIndex((rightItem) => {
                    const logger = compareInner({
                        left: leftItem,
                        right: rightItem,
                        exactArrays,
                        forwardComparison,
                    });

                    return logger.diffLog.length === 0;
                });

                if (index >= 0) {
                    rightCopy.splice(index, 1);
                }

                if (rightCopy.length === 0) {
                    break;
                }
            }

            for (const item of rightCopy) {
                innerLogger.addDiffItem({
                    type: DiffType.ArrayMissingValue,
                    side: forwardComparison ? 'left' : 'right',
                    expected: item,
                });
            }
        }
    } else if (isObject(left) && isObject(right)) {
        for (const [rightKey, rightValue] of Object.entries(right)) {
            innerLogger.addContext({ objectField: rightKey });

            if (!Object.hasOwn(left, rightKey)) {
                innerLogger.removeContext();

                innerLogger.addDiffItem({
                    type: DiffType.ObjectMissingProperty,
                    side: forwardComparison ? 'left' : 'right',
                    expected: {
                        key: rightKey,
                        value: rightValue,
                    },
                });

                continue;
            }

            const leftValue = (left as JsonObject)[rightKey] ?? null;

            compareInner({
                left: leftValue,
                right: rightValue,
                forwardComparison,
                exactArrays,
                logger: innerLogger,
            });

            innerLogger.removeContext();
        }
    } else if (left !== right) {
        innerLogger.addDiffItem({
            type: DiffType.ValueMismatch,
            side: forwardComparison ? 'left' : 'right',
            expected: right,
            received: left,
        });
    }

    return innerLogger;
}
