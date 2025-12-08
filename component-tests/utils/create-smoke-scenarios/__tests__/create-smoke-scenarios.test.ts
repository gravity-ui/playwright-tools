import { describe, expect, test } from '@jest/globals';

import { createSmokeScenarios } from '../create-smoke-scenarios';

describe('storybook', () => {
    describe('createSmokeScenarios', () => {
        test('regular', () => {
            const smokeScenarios = createSmokeScenarios(
                {
                    theme: 'theme-1',
                    label: 'label-1',
                },
                {
                    theme: ['theme-2', 'theme-3'],
                    label: ['label-2', 'label-3'],
                },
            );

            expect(smokeScenarios).toEqual([
                [
                    '[default]',
                    {
                        label: 'label-1',
                        theme: 'theme-1',
                    },
                ],
                [
                    '[theme: theme-2]',
                    {
                        label: 'label-1',
                        theme: 'theme-2',
                    },
                ],
                [
                    '[theme: theme-3]',
                    {
                        label: 'label-1',
                        theme: 'theme-3',
                    },
                ],
                [
                    '[label: label-2]',
                    {
                        label: 'label-2',
                        theme: 'theme-1',
                    },
                ],
                [
                    '[label: label-3]',
                    {
                        label: 'label-3',
                        theme: 'theme-1',
                    },
                ],
            ]);
        });

        test('with scenario name', () => {
            const smokeScenarios = createSmokeScenarios(
                {
                    theme: 'theme-1',
                    label: 'label-1',
                },
                {
                    theme: [
                        ['name-theme-2', 'theme-2'],
                        ['name-theme-3', 'theme-3'],
                    ],
                    label: [
                        ['name-label-2', 'label-2'],
                        ['name-label-3', 'label-3'],
                    ],
                },
            );

            expect(smokeScenarios).toEqual([
                [
                    '[default]',
                    {
                        label: 'label-1',
                        theme: 'theme-1',
                    },
                ],
                [
                    '[theme: name-theme-2]',
                    {
                        label: 'label-1',
                        theme: 'theme-2',
                    },
                ],
                [
                    '[theme: name-theme-3]',
                    {
                        label: 'label-1',
                        theme: 'theme-3',
                    },
                ],
                [
                    '[label: name-label-2]',
                    {
                        label: 'label-2',
                        theme: 'theme-1',
                    },
                ],
                [
                    '[label: name-label-3]',
                    {
                        label: 'label-3',
                        theme: 'theme-1',
                    },
                ],
            ]);
        });

        test('with scenario name in options', () => {
            const smokeScenarios = createSmokeScenarios(
                {
                    theme: 'theme-1',
                    label: 'label-1',
                },
                {
                    theme: ['theme-2', 'theme-3'],
                },
                { scenarioName: 'custom-scenario' },
            );

            expect(smokeScenarios).toEqual([
                [
                    ' custom-scenario [default]',
                    {
                        label: 'label-1',
                        theme: 'theme-1',
                    },
                ],
                [
                    ' custom-scenario [theme: theme-2]',
                    {
                        label: 'label-1',
                        theme: 'theme-2',
                    },
                ],
                [
                    ' custom-scenario [theme: theme-3]',
                    {
                        label: 'label-1',
                        theme: 'theme-3',
                    },
                ],
            ]);
        });

        test('multiple properties', () => {
            const smokeScenarios = createSmokeScenarios(
                {
                    theme: 'theme-1',
                    label: 'label-1',
                    size: 'medium',
                },
                {
                    theme: ['theme-2'],
                    label: ['label-2'],
                    size: ['small', 'large'],
                },
            );

            expect(smokeScenarios).toEqual([
                [
                    '[default]',
                    {
                        theme: 'theme-1',
                        label: 'label-1',
                        size: 'medium',
                    },
                ],
                [
                    '[theme: theme-2]',
                    {
                        theme: 'theme-2',
                        label: 'label-1',
                        size: 'medium',
                    },
                ],
                [
                    '[label: label-2]',
                    {
                        theme: 'theme-1',
                        label: 'label-2',
                        size: 'medium',
                    },
                ],
                [
                    '[size: small]',
                    {
                        theme: 'theme-1',
                        label: 'label-1',
                        size: 'small',
                    },
                ],
                [
                    '[size: large]',
                    {
                        theme: 'theme-1',
                        label: 'label-1',
                        size: 'large',
                    },
                ],
            ]);
        });

        test('mixed case types', () => {
            const smokeScenarios = createSmokeScenarios(
                {
                    theme: 'theme-1',
                    label: 'label-1',
                },
                {
                    theme: [['named-theme', 'theme-2']],
                    label: ['label-2'],
                },
            );

            expect(smokeScenarios).toEqual([
                [
                    '[default]',
                    {
                        theme: 'theme-1',
                        label: 'label-1',
                    },
                ],
                [
                    '[theme: named-theme]',
                    {
                        theme: 'theme-2',
                        label: 'label-1',
                    },
                ],
                [
                    '[label: label-2]',
                    {
                        theme: 'theme-1',
                        label: 'label-2',
                    },
                ],
            ]);
        });

        test('empty propsCases', () => {
            const smokeScenarios = createSmokeScenarios(
                {
                    theme: 'theme-1',
                    label: 'label-1',
                },
                {},
            );

            expect(smokeScenarios).toEqual([
                [
                    '[default]',
                    {
                        theme: 'theme-1',
                        label: 'label-1',
                    },
                ],
            ]);
        });

        test('empty arrays in propsCases', () => {
            const smokeScenarios = createSmokeScenarios(
                {
                    theme: 'theme-1',
                    label: 'label-1',
                },
                {
                    theme: [],
                    label: ['label-2'],
                },
            );

            expect(smokeScenarios).toEqual([
                [
                    '[default]',
                    {
                        theme: 'theme-1',
                        label: 'label-1',
                    },
                ],
                [
                    '[label: label-2]',
                    {
                        theme: 'theme-1',
                        label: 'label-2',
                    },
                ],
            ]);
        });

        test('undefined properties in propsCases', () => {
            const smokeScenarios = createSmokeScenarios(
                {
                    theme: 'theme-1',
                    label: 'label-1',
                },
                {
                    theme: undefined,
                    label: ['label-2'],
                },
            );

            expect(smokeScenarios).toEqual([
                [
                    '[default]',
                    {
                        theme: 'theme-1',
                        label: 'label-1',
                    },
                ],
                [
                    '[label: label-2]',
                    {
                        theme: 'theme-1',
                        label: 'label-2',
                    },
                ],
            ]);
        });

        test('numeric values with toString', () => {
            const smokeScenarios = createSmokeScenarios(
                {
                    count: 1,
                },
                {
                    count: [2, 3, 0],
                },
            );

            expect(smokeScenarios).toEqual([
                [
                    '[default]',
                    {
                        count: 1,
                    },
                ],
                [
                    '[count: 2]',
                    {
                        count: 2,
                    },
                ],
                [
                    '[count: 3]',
                    {
                        count: 3,
                    },
                ],
                [
                    '[count: 0]',
                    {
                        count: 0,
                    },
                ],
            ]);
        });

        test('boolean values with toString', () => {
            const smokeScenarios = createSmokeScenarios(
                {
                    enabled: false,
                },
                {
                    enabled: [true],
                },
            );

            expect(smokeScenarios).toEqual([
                [
                    '[default]',
                    {
                        enabled: false,
                    },
                ],
                [
                    '[enabled: true]',
                    {
                        enabled: true,
                    },
                ],
            ]);
        });

        test('objects without toString method should throw error', () => {
            const objectWithoutToString = Object.create(null);
            objectWithoutToString.value = 'test';

            expect(() => {
                createSmokeScenarios(
                    {
                        config: { default: true },
                    },
                    {
                        config: [objectWithoutToString],
                    },
                );
            }).toThrow('The case value does not have a method "toString", use case with name.');
        });

        test('objects with custom toString method', () => {
            const customObject = {
                default: true,
                value: 'custom',
                toString() {
                    return `custom-${this.value}`;
                },
            };

            const smokeScenarios = createSmokeScenarios(
                {
                    config: { default: true },
                },
                {
                    config: [customObject],
                },
            );

            expect(smokeScenarios).toEqual([
                [
                    '[default]',
                    {
                        config: { default: true },
                    },
                ],
                [
                    '[config: custom-custom]',
                    {
                        config: customObject,
                    },
                ],
            ]);
        });
    });
});
