import type { Json, JsonPrimitive } from '../../types';

import type { DecoratedLineType, DiffType, PathAnnotationType } from './constants';

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

export type PathAnnotationType = (typeof PathAnnotationType)[keyof typeof PathAnnotationType];

export type ObjectMissingPropertyAnnotation = {
    type: typeof PathAnnotationType.ObjectMissingProperty;
    expected: { key: string; value: Json };
};

export type ObjectExtraPropertyAnnotation = {
    type: typeof PathAnnotationType.ObjectExtraProperty;
};

export type ArrayMissingValueAnnotation = {
    type: typeof PathAnnotationType.ArrayMissingValue;
    expected: Json;
};

export type ValueMismatchAnnotation = {
    type: typeof PathAnnotationType.ValueMismatch;
    expected?: Json;
    received?: Json;
};
