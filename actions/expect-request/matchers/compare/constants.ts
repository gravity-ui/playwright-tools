export const DiffType = {
    ValueMismatch: 'value-mismatch',
    ObjectMissingProperty: 'object-missing-property',
    ArrayMissingValue: 'array-missing-value',
} as const;

export const DecoratedLineType = {
    ObjectOpen: 'object-open',
    ObjectClose: 'object-close',
    ArrayOpen: 'array-open',
    ArrayClose: 'array-close',
    PrimitiveValue: 'primitive-value',
    EmptyObject: 'empty-object',
    EmptyArray: 'empty-array',
} as const;

export const PathAnnotationType = {
    ValueMismatch: 'value-mismatch',
    ObjectMissingProperty: 'object-missing-property',
    ObjectExtraProperty: 'object-extra-property',
    ArrayMissingValue: 'array-missing-value',
} as const;
