import { describe, expect, it } from '@jest/globals';

import type { DiffLog } from '../compare';
import { compare } from '../compare';

describe('compare', () => {
    it('shows a simple value mismatch', () => {
        const left = true;
        const right = false;

        const diffLog = compare({ left, right });

        expect(diffLog).toStrictEqual([
            {
                type: 'value-mismatch',
                side: 'left',
                expected: false,
                received: true,
                context: [],
            },
            {
                type: 'value-mismatch',
                side: 'right',
                expected: true,
                received: false,
                context: [],
            },
        ] as DiffLog);
    });

    it('shows an array missing values', () => {
        const left = [1, 2, 3];
        const right = [1, 2, 4];

        const diffLog = compare({ left, right });

        expect(diffLog).toStrictEqual([
            {
                type: 'array-missing-value',
                side: 'left',
                expected: 4,
                context: [],
            },
            {
                type: 'array-missing-value',
                side: 'right',
                expected: 3,
                context: [],
            },
        ] as DiffLog);
    });

    it('shows an object missing properties', () => {
        const left = { name: 'some-name', age: 33, date: '2025-01-01' };
        const right = { name: 'some-name' };

        const diffLog = compare({ left, right });

        expect(diffLog).toStrictEqual([
            {
                type: 'object-missing-property',
                side: 'right',
                expected: { key: 'age', value: 33 },
                context: [],
            },
            {
                type: 'object-missing-property',
                side: 'right',
                expected: { key: 'date', value: '2025-01-01' },
                context: [],
            },
        ] as DiffLog);
    });

    it('forms a correct diff context with arrays', () => {
        const left = [1, 2, 3];
        const right = [1, 2, 4];

        const diffLog = compare({ left, right, exactArrays: true });

        expect(diffLog).toStrictEqual([
            {
                type: 'value-mismatch',
                side: 'left',
                expected: 4,
                received: 3,
                context: [
                    {
                        arrayIndex: 2,
                    },
                ],
            },
            {
                type: 'value-mismatch',
                side: 'right',
                expected: 3,
                received: 4,
                context: [
                    {
                        arrayIndex: 2,
                    },
                ],
            },
        ] as DiffLog);
    });

    it('forms a correct diff context with objects', () => {
        const left = {
            level1: {
                level2a: { level3: { name: 'some-name-1' } },
                level2b: { level3: { age: 33 } },
            },
        };
        const right = {
            level1: {
                level2a: { level3: { name: 'some-name-2' } },
                level2b: { level3: { age: 11 } },
            },
        };

        const diffLog = compare({ left, right });

        expect(diffLog).toStrictEqual([
            {
                type: 'value-mismatch',
                side: 'left',
                expected: 'some-name-2',
                received: 'some-name-1',
                context: [
                    { objectField: 'level1' },
                    { objectField: 'level2a' },
                    { objectField: 'level3' },
                    { objectField: 'name' },
                ],
            },
            {
                type: 'value-mismatch',
                side: 'left',
                expected: 11,
                received: 33,
                context: [
                    { objectField: 'level1' },
                    { objectField: 'level2b' },
                    { objectField: 'level3' },
                    { objectField: 'age' },
                ],
            },
            {
                type: 'value-mismatch',
                side: 'right',
                expected: 'some-name-1',
                received: 'some-name-2',
                context: [
                    { objectField: 'level1' },
                    { objectField: 'level2a' },
                    { objectField: 'level3' },
                    { objectField: 'name' },
                ],
            },
            {
                type: 'value-mismatch',
                side: 'right',
                expected: 33,
                received: 11,
                context: [
                    { objectField: 'level1' },
                    { objectField: 'level2b' },
                    { objectField: 'level3' },
                    { objectField: 'age' },
                ],
            },
        ] as DiffLog);
    });

    it('forms a correct diff context with arrays in objects', () => {
        const left = { level1: { level2: [1, 2, 3] } };
        const right = { level1: { level2: [1, 4, 3] } };

        const diffLog = compare({ left, right, exactArrays: true });

        expect(diffLog).toStrictEqual([
            {
                type: 'value-mismatch',
                side: 'left',
                expected: 4,
                received: 2,
                context: [{ objectField: 'level1' }, { objectField: 'level2' }, { arrayIndex: 1 }],
            },
            {
                type: 'value-mismatch',
                side: 'right',
                expected: 2,
                received: 4,
                context: [{ objectField: 'level1' }, { objectField: 'level2' }, { arrayIndex: 1 }],
            },
        ] as DiffLog);
    });
});
