import { describe, expect, it } from '@jest/globals';

import type { Json } from '../../types';
import { DiffPrinter } from '../compare/DiffPrinter';

function makeExpects({ left, right }: { left: Json; right: Json }) {
    const printer = new DiffPrinter({ left, right });

    const leftSideDiff = printer.printDiff({ side: 'left' });
    expect(leftSideDiff).toMatchSnapshot('1) left side diff');

    const rightSideDiff = printer.printDiff({ side: 'right' });
    expect(rightSideDiff).toMatchSnapshot('2) right side diff');

    const leftSideDiffExact = printer.printDiff({ side: 'left', exact: true });
    expect(leftSideDiffExact).toMatchSnapshot('3) left side diff exact');

    const rightSideDiffExact = printer.printDiff({ side: 'right', exact: true });
    expect(rightSideDiffExact).toMatchSnapshot('4) right side diff exact');
}

describe('diff-printer', () => {
    it('should not render diff when left and right are equal', () => {
        makeExpects({
            left: {
                arrayData: [1, 2, { textData: 'txt' }],
                textData: 'txt',
                nullData: null,
                booleanData: true,
                objectData: { textData: 'txt' },
            },
            right: {
                textData: 'txt',
                nullData: null,
                booleanData: true,
                objectData: { textData: 'txt' },
                arrayData: [1, 2, { textData: 'txt' }],
            },
        });
    });

    it('renders diff when left and right are primitives', () => {
        makeExpects({
            left: true,
            right: null,
        });
    });

    it('renders diff when left is primitive and right is empty object', () => {
        makeExpects({
            left: 'text',
            right: {},
        });
    });

    it('renders diff when left is primitive and right is empty array', () => {
        makeExpects({
            left: 'text',
            right: [],
        });
    });

    it('renders diff when left is empty object and right is empty array', () => {
        makeExpects({
            left: {},
            right: [],
        });
    });

    it('renders diff when left is primitive and right is object', () => {
        makeExpects({
            left: 'text',
            right: { data: 'text' },
        });
    });

    it('renders diff when left is object with empty object and right is primitive', () => {
        makeExpects({
            left: { emptyObject: {} },
            right: 'text',
        });
    });

    it('renders diff when left is object with empty array and right is primitive', () => {
        makeExpects({
            left: { emptyArray: [] },
            right: 'text',
        });
    });

    it('renders diff when left and right contain different empty non-primitives', () => {
        makeExpects({
            left: { emptyNonPrimitive: [] },
            right: { emptyNonPrimitive: {} },
        });
    });

    it('renders diff when right array includes left array', () => {
        makeExpects({
            left: [1, 2],
            right: [3, 1, 2],
        });
    });

    it('renders diff when left and right are arrays with equal length', () => {
        makeExpects({
            left: [1, 2, 3],
            right: [3, 2, 1],
        });
    });

    it('renders diff when left and right are objects', () => {
        makeExpects({
            left: { extraField: 'data', sameData: 'txt' },
            right: { rightField: 'data', sameData: 'txt' },
        });
    });

    it('renders diff when left is missing properties or right has extra properties', () => {
        makeExpects({
            left: { name: 'some-name', extraField: 'some-data' },
            right: {
                name: 'some-name',
                age: 33,
                objectData: { text: 'text' },
                nullData: null,
                arrayData: [1],
            },
        });
    });

    it('renders diff with deep nested primitive value mismatch', () => {
        makeExpects({
            left: { lvl1: { lvl2: { lvl3: { mismatch: 'data', sameData: 'txt' } } } },
            right: { lvl1: { lvl2: { lvl3: { mismatch: 'date', sameData: 'txt' } } } },
        });
    });

    it('renders diff with nested primitive and object mismatch', () => {
        makeExpects({
            left: { lvl1: { lvl2: { lvl3: { mismatch: 'data', sameData: 'txt' } } } },
            right: { lvl1: { lvl2: { lvl3: { mismatch: { data: 'txt' }, sameData: 'txt' } } } },
        });
    });

    it('renders diff with nested arrays with mismatches', () => {
        makeExpects({
            left: {
                data: [
                    [1, 2],
                    [3, 4],
                ],
            },
            right: {
                data: [
                    [1, 2],
                    [3, 5],
                ],
            },
        });
    });

    it('renders diff with special characters in keys', () => {
        makeExpects({
            left: { 'key-with-dash': 'value1', 'key.with.dots': 'value2' },
            right: { 'key-with-dash': 'different', 'key.with.dots': 'value2' },
        });
    });

    it('renders diff for complex nested structures', () => {
        makeExpects({
            left: {
                level1: {
                    level2A: {
                        level3A: { value: 'original' },
                        level3B: [1, 2, { nestedValue: 'same' }],
                    },
                    level2B: 'unchanged',
                },
            },
            right: {
                level1: {
                    level2A: {
                        level3A: { value: 'changed' },
                        level3B: [1, 2, { nestedValue: 'same' }],
                    },
                    level2B: 'unchanged',
                },
            },
        });
    });

    it('renders diff for arrays with mixed types', () => {
        makeExpects({
            left: [1, 'string', true, { key1: 'value1', key2: 'value2' }],
            right: [1, 'different', true, { key1: 'changed1', key2: 'changed2' }],
        });
    });

    it('renders diff for objects with numeric keys', () => {
        makeExpects({
            left: { '0': 'zero', '1': 'one' },
            right: { '0': 'zero', '1': 'changed' },
        });
    });
});
