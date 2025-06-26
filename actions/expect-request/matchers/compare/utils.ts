import { PathAnnotationType } from './constants';
import type {
    ArrayMissingValueAnnotation,
    ObjectMissingPropertyAnnotation,
    PathAnnotation,
    ValueMismatchAnnotation,
} from './types';

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
