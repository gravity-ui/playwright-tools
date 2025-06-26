/* eslint-disable complexity */
import type { Json, JsonArray, JsonObject, JsonPrimitive } from '../../types';
import { isObject } from '../utils';

import { DecoratedLineType } from './constants';
import type { DecoratedLine, PathAnnotation } from './types';
import {
    isArrayMissingValueAnnotation,
    isObjectExtraPropertyAnnotation,
    isObjectMissingPropertyAnnotation,
    isValueMismatchAnnotation,
} from './utils';

export function printJsonDiff(params: {
    json: Json;
    pathAnnotations?: Record<string, PathAnnotation[]>;
}) {
    const { json, pathAnnotations } = params;

    const lines = makeJsonDecoratedLines({ json, pathAnnotations, level: 0, path: '' });
    const formattedLines = lines.map(formatDecoratedLine);

    return formattedLines.join('\n');
}

function formatDecoratedLine(line: DecoratedLine): string {
    const { type, level, fieldName, diffMarker } = line;

    let content: string;
    switch (type) {
        case DecoratedLineType.PrimitiveValue:
            content = `${fieldName ? formatPrimitive(fieldName) + ': ' : ''}${formatPrimitive(line.value)}${level === 0 ? '' : ','}`;
            break;
        case DecoratedLineType.ObjectOpen:
            content = `${fieldName ? formatPrimitive(fieldName) + ': ' : ''}{`;
            break;
        case DecoratedLineType.ArrayOpen:
            content = `${fieldName ? formatPrimitive(fieldName) + ': ' : ''}[`;
            break;
        case DecoratedLineType.ObjectClose:
            content = `}${level === 0 ? '' : ','}`;
            break;
        case DecoratedLineType.ArrayClose:
            content = `]${level === 0 ? '' : ','}`;
            break;
        case DecoratedLineType.EmptyObject:
            content = `${fieldName ? formatPrimitive(fieldName) + ': ' : ''}{}${level === 0 ? '' : ','}`;
            break;
        case DecoratedLineType.EmptyArray:
            content = `${fieldName ? formatPrimitive(fieldName) + ': ' : ''}[]${level === 0 ? '' : ','}`;
            break;
    }

    let prefix = '';
    if (diffMarker) {
        prefix = diffMarker === 'expected' ? '-' : '+';
    }

    return `${prefix ? prefix + ' ' : '  '}${Array.from({ length: level })
        .map(() => '  ')
        .join('')}${content}`;
}

function formatPrimitive(jsonPrimitive: JsonPrimitive): string {
    if (typeof jsonPrimitive === 'string') {
        return `"${jsonPrimitive}"`;
    }

    return `${jsonPrimitive}`;
}

interface MakeDecoratedLinesCommonParams {
    path: string;
    level: number;
    pathAnnotations?: Record<string, PathAnnotation[]>;
    contentOnly?: boolean;
    diffMarker?: 'expected' | 'received';
    fieldName?: string;
}

interface MakeJsonDecoratedLinesParams extends MakeDecoratedLinesCommonParams {
    json: Json;
    decoratedLines?: DecoratedLine[];
}

function makeJsonDecoratedLines(params: MakeJsonDecoratedLinesParams): DecoratedLine[] {
    const {
        json,
        path,
        level,
        pathAnnotations,
        decoratedLines: paramsDecoratedLines,
        contentOnly,
        diffMarker,
        fieldName,
    } = params;

    const decoratedLines: DecoratedLine[] = paramsDecoratedLines ? paramsDecoratedLines : [];

    if (Array.isArray(json)) {
        makeArrayDecoratedLines({
            json,
            path,
            level,
            pathAnnotations,
            decoratedLines,
            contentOnly,
            diffMarker,
            fieldName,
        });
    } else if (isObject(json)) {
        makeObjectDecoratedLines({
            json,
            path,
            level,
            pathAnnotations,
            decoratedLines,
            contentOnly,
            diffMarker,
            fieldName,
        });
    } else {
        const currentPathAnnotations = pathAnnotations?.[path] || [];
        const valueMismatchAnnotations = currentPathAnnotations.filter(isValueMismatchAnnotation);
        if (valueMismatchAnnotations.length) {
            for (const { expected, received } of valueMismatchAnnotations) {
                if (expected !== undefined) {
                    makeJsonDecoratedLines({
                        json: expected,
                        path,
                        level,
                        decoratedLines,
                        diffMarker: 'expected',
                        fieldName,
                    });
                }

                if (received !== undefined) {
                    makeJsonDecoratedLines({
                        json: received,
                        path,
                        level,
                        decoratedLines,
                        diffMarker: 'received',
                        fieldName,
                    });
                }
            }
        } else {
            decoratedLines.push({
                type: DecoratedLineType.PrimitiveValue,
                level,
                value: json,
                diffMarker,
                fieldName,
            });
        }
    }

    return decoratedLines;
}

interface MakeObjectDecoratedLinesParams extends MakeDecoratedLinesCommonParams {
    json: JsonObject;
    decoratedLines: DecoratedLine[];
}

function makeObjectDecoratedLines(params: MakeObjectDecoratedLinesParams) {
    const {
        json,
        path,
        decoratedLines,
        pathAnnotations,
        contentOnly,
        diffMarker,
        level,
        fieldName,
    } = params;

    let innerLevel = level;

    const objectEntries = Object.entries(json);
    const objectAnnotations = pathAnnotations?.[path] || [];
    const missingValueAnnotations = objectAnnotations.filter(isObjectMissingPropertyAnnotation);

    const valueMismatchAnnotation = objectAnnotations.find(isValueMismatchAnnotation);
    if (valueMismatchAnnotation) {
        const { expected, received } = valueMismatchAnnotation;

        if (expected !== undefined) {
            makeJsonDecoratedLines({
                decoratedLines,
                json: expected,
                path,
                level,
                diffMarker: 'expected',
            });
        }

        if (received !== undefined) {
            makeJsonDecoratedLines({
                decoratedLines,
                json: received,
                path,
                level,
                diffMarker: 'received',
            });
        }

        return;
    }

    if (!missingValueAnnotations.length && !objectEntries.length) {
        decoratedLines.push({ type: DecoratedLineType.EmptyObject, level, diffMarker, fieldName });
        return;
    }

    if (!contentOnly) {
        decoratedLines.push({
            type: DecoratedLineType.ObjectOpen,
            level: innerLevel,
            diffMarker,
            fieldName,
        });
        innerLevel++;
    }

    for (const { expected } of missingValueAnnotations) {
        makeJsonDecoratedLines({
            json: { [expected.key]: expected.value },
            path,
            level: innerLevel,
            decoratedLines,
            contentOnly: true,
            diffMarker: 'expected',
        });
    }

    for (const [key, value] of objectEntries) {
        const currentPath = `${path ? path + '.' : ''}${key}`;
        const currentPathAnnotations = pathAnnotations?.[currentPath] || [];

        const extraPropertyAnnotation = currentPathAnnotations.find(
            isObjectExtraPropertyAnnotation,
        );
        if (extraPropertyAnnotation) {
            makeJsonDecoratedLines({
                json: value,
                path,
                level: innerLevel,
                decoratedLines,
                diffMarker: 'received',
                fieldName: key,
            });

            continue;
        }

        const valueMismatchAnnotation = currentPathAnnotations.find(isValueMismatchAnnotation);
        if (valueMismatchAnnotation) {
            const { expected, received } = valueMismatchAnnotation;

            if (expected !== undefined) {
                makeJsonDecoratedLines({
                    json: expected,
                    path,
                    level: innerLevel,
                    decoratedLines,
                    diffMarker: 'expected',
                    fieldName: key,
                });
            }

            if (received !== undefined) {
                makeJsonDecoratedLines({
                    json: received,
                    path,
                    level: innerLevel,
                    decoratedLines,
                    diffMarker: 'received',
                    fieldName: key,
                });
            }

            continue;
        }

        if (Array.isArray(value)) {
            makeArrayDecoratedLines({
                json: value,
                path: currentPath,
                level: innerLevel,
                pathAnnotations,
                decoratedLines,
                diffMarker,
                fieldName: key,
            });
        } else if (isObject(value)) {
            makeObjectDecoratedLines({
                json: value,
                path: currentPath,
                level: innerLevel,
                pathAnnotations,
                decoratedLines,
                diffMarker,
                fieldName: key,
            });
        } else {
            decoratedLines.push({
                type: DecoratedLineType.PrimitiveValue,
                level: innerLevel,
                value,
                diffMarker,
                fieldName: key,
            });
        }
    }

    if (!contentOnly) {
        innerLevel--;
        decoratedLines.push({
            level: innerLevel,
            type: DecoratedLineType.ObjectClose,
            diffMarker,
        });
    }
}

interface MakeArrayDecoratedLinesParams extends MakeDecoratedLinesCommonParams {
    json: JsonArray;
    decoratedLines: DecoratedLine[];
}

function makeArrayDecoratedLines(params: MakeArrayDecoratedLinesParams) {
    const {
        json,
        path,
        decoratedLines,
        pathAnnotations,
        contentOnly,
        diffMarker,
        level,
        fieldName,
    } = params;

    let innerLevel = level;

    const annotations = pathAnnotations?.[path] || [];
    const missingValueAnnotations = annotations.filter(isArrayMissingValueAnnotation);

    if (!missingValueAnnotations.length && !json.length) {
        decoratedLines.push({ level, type: DecoratedLineType.EmptyArray, diffMarker, fieldName });
        return;
    }

    const valueMismatchAnnotation = annotations.find(isValueMismatchAnnotation);
    if (valueMismatchAnnotation) {
        const { expected, received } = valueMismatchAnnotation;

        if (expected !== undefined) {
            makeJsonDecoratedLines({
                decoratedLines,
                json: expected,
                path,
                level,
                diffMarker: 'expected',
            });
        }

        if (received !== undefined) {
            makeJsonDecoratedLines({
                decoratedLines,
                json: received,
                path,
                level,
                diffMarker: 'received',
            });
        }

        return;
    }

    if (!contentOnly) {
        decoratedLines.push({
            level: innerLevel,
            fieldName,
            type: DecoratedLineType.ArrayOpen,
            diffMarker,
        });
        innerLevel++;
    }

    for (let i = 0; i < json.length; ++i) {
        const currentPath = `${path ? path + '.' : ''}[${i}]`;
        const currentPathAnnotations = pathAnnotations?.[currentPath] || [];

        const valueMismatchAnnotation = currentPathAnnotations.find(isValueMismatchAnnotation);
        if (valueMismatchAnnotation) {
            const { expected, received } = valueMismatchAnnotation;

            if (expected !== undefined) {
                makeJsonDecoratedLines({
                    decoratedLines,
                    json: expected,
                    path,
                    level: innerLevel,
                    diffMarker: 'expected',
                });
            }

            if (received !== undefined) {
                makeJsonDecoratedLines({
                    decoratedLines,
                    json: received,
                    path,
                    level: innerLevel,
                    diffMarker: 'received',
                });
            }

            continue;
        }

        const value = json[i]!;

        if (Array.isArray(value)) {
            makeArrayDecoratedLines({
                json: value,
                decoratedLines,
                level: innerLevel,
                path: currentPath,
                diffMarker,
                pathAnnotations,
            });
        } else if (isObject(value)) {
            makeObjectDecoratedLines({
                json: value,
                decoratedLines,
                level: innerLevel,
                path: currentPath,
                diffMarker,
                pathAnnotations,
            });
        } else {
            decoratedLines.push({
                level: innerLevel,
                type: DecoratedLineType.PrimitiveValue,
                value,
                diffMarker,
            });
        }
    }

    for (const { expected } of missingValueAnnotations) {
        makeJsonDecoratedLines({
            decoratedLines,
            json: expected,
            path,
            level: innerLevel,
            diffMarker: 'expected',
        });
    }

    if (!contentOnly) {
        innerLevel--;
        decoratedLines.push({
            level: innerLevel,
            type: DecoratedLineType.ArrayClose,
            diffMarker,
        });
    }
}
