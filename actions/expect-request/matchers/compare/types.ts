import type { Json, JsonPrimitive } from '../../types';

// eslint-disable-next-line @typescript-eslint/consistent-type-imports -- constants are used in typeof expressions
import {
    DecoratedLineType as DecoratedLineTypeConst,
    DiffType as DiffTypeConst,
    PathAnnotationType as PathAnnotationTypeConst,
} from './constants';

export type DiffType = (typeof DiffTypeConst)[keyof typeof DiffTypeConst];
export type DecoratedLineType =
    (typeof DecoratedLineTypeConst)[keyof typeof DecoratedLineTypeConst];
export type PathAnnotationType =
    (typeof PathAnnotationTypeConst)[keyof typeof PathAnnotationTypeConst];

export type DiffLog = DiffItem[];

export type DiffItem = DiffItemBase & { context: DiffContextItem[] };
export type DiffItemBase = {
    side?: 'left' | 'right';
} & (
    | {
          type: typeof DiffTypeConst.ValueMismatch;
          expected?: Json;
          received?: Json;
      }
    | {
          type: typeof DiffTypeConst.ObjectMissingProperty;
          expected: { key: string; value: Json };
      }
    | {
          type: typeof DiffTypeConst.ArrayMissingValue;
          expected: Json;
      }
);

export type DiffContextItem = {
    objectField?: string;
    arrayIndex?: number;
};

export type DecoratedLine = {
    fieldName?: string;
    level: number;
    diffMarker?: 'expected' | 'received';
} & (
    | {
          type: typeof DecoratedLineTypeConst.PrimitiveValue;
          value: JsonPrimitive;
      }
    | {
          type: Exclude<DecoratedLineType, typeof DecoratedLineTypeConst.PrimitiveValue>;
      }
);

export type PathAnnotation =
    | ObjectMissingPropertyAnnotation
    | ObjectExtraPropertyAnnotation
    | ArrayMissingValueAnnotation
    | ValueMismatchAnnotation;

export type ObjectMissingPropertyAnnotation = {
    type: typeof PathAnnotationTypeConst.ObjectMissingProperty;
    expected: { key: string; value: Json };
};
export type ObjectExtraPropertyAnnotation = {
    type: typeof PathAnnotationTypeConst.ObjectExtraProperty;
};
export type ArrayMissingValueAnnotation = {
    type: typeof PathAnnotationTypeConst.ArrayMissingValue;
    expected: Json;
};
export type ValueMismatchAnnotation = {
    type: typeof PathAnnotationTypeConst.ValueMismatch;
    expected?: Json;
    received?: Json;
};
