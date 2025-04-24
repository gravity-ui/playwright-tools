import type { Json, JsonPrimitive } from '../../types';

export const DiffType = {
    ValueMismatch: 'value-mismatch',
    ObjectMissingProperty: 'object-missing-property',
    ArrayMissingValue: 'array-missing-value',
} as const;
export type DiffType = (typeof DiffType)[keyof typeof DiffType];

export type DiffLog = DiffItem[];

export type DiffItem = DiffItemBase & { context: DiffContextItem[] };
export type DiffItemBase = {
    side?: 'left' | 'right';
} & (
    | {
          type: typeof DiffType.ValueMismatch;
          expected?: Json;
          received?: Json;
      }
    | {
          type: typeof DiffType.ObjectMissingProperty;
          expected: { key: string; value: Json };
      }
    | {
          type: typeof DiffType.ArrayMissingValue;
          expected: Json;
      }
);

export type DiffContextItem = {
    objectField?: string;
    arrayIndex?: number;
};

export const DecoratedLineType = {
    ObjectOpen: 'object-open',
    ObjectClose: 'object-close',
    ArrayOpen: 'array-open',
    ArrayClose: 'array-close',
    PrimitiveValue: 'primitive-value',
    EmptyObject: 'empty-object',
    EmptyArray: 'empty-array',
} as const;
export type DecoratedLineType = (typeof DecoratedLineType)[keyof typeof DecoratedLineType];

export type DecoratedLine = {
    fieldName?: string;
    level: number;
    diffMarker?: 'expected' | 'received';
} & (
    | {
          type: typeof DecoratedLineType.PrimitiveValue;
          value: JsonPrimitive;
      }
    | {
          type: Exclude<DecoratedLineType, typeof DecoratedLineType.PrimitiveValue>;
      }
);

export type PathAnnotation =
    | ObjectMissingPropertyAnnotation
    | ObjectExtraPropertyAnnotation
    | ArrayMissingValueAnnotation
    | ValueMismatchAnnotation;

export const PathAnnotationType = {
    ValueMismatch: 'value-mismatch',
    ObjectMissingProperty: 'object-missing-property',
    ObjectExtraProperty: 'object-extra-property',
    ArrayMissingValue: 'array-missing-value',
} as const;
export type PathAnnotationType = (typeof PathAnnotationType)[keyof typeof PathAnnotationType];

type ObjectMissingPropertyAnnotation = {
    type: typeof PathAnnotationType.ObjectMissingProperty;
    expected: { key: string; value: Json };
};
type ObjectExtraPropertyAnnotation = {
    type: typeof PathAnnotationType.ObjectExtraProperty;
};
type ArrayMissingValueAnnotation = {
    type: typeof PathAnnotationType.ArrayMissingValue;
    expected: Json;
};
type ValueMismatchAnnotation = {
    type: typeof PathAnnotationType.ValueMismatch;
    expected?: Json;
    received?: Json;
};

export function isValueMismatchAnnotation(
    annotation: PathAnnotation,
): annotation is ValueMismatchAnnotation {
    return annotation.type === PathAnnotationType.ValueMismatch;
}

export function isObjectMissingPropertyAnnotation(
    annotation: PathAnnotation,
): annotation is ObjectMissingPropertyAnnotation {
    return annotation.type === PathAnnotationType.ObjectMissingProperty;
}

export function isObjectExtraPropertyAnnotation(
    annotation: PathAnnotation,
): annotation is ArrayMissingValueAnnotation {
    return annotation.type === PathAnnotationType.ObjectExtraProperty;
}

export function isArrayMissingValueAnnotation(
    annotation: PathAnnotation,
): annotation is ArrayMissingValueAnnotation {
    return annotation.type === PathAnnotationType.ArrayMissingValue;
}
