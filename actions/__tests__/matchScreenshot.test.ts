import { beforeEach, describe, expect, it, jest } from '@jest/globals';

const toHaveScreenshot = jest.fn<(...args: unknown[]) => Promise<void>>();

jest.mock('@playwright/test', () => {
    const assertions = { toHaveScreenshot };
    const expect = Object.assign(
        jest.fn(() => assertions),
        { soft: jest.fn(() => assertions) },
    );

    return { expect };
});

const getTestSlug = jest.fn<() => string | undefined>();

jest.mock('../getTestSlug', () => ({ getTestSlug }));

// eslint-disable-next-line import/order
import { matchScreenshot } from '../matchScreenshot';

const page = {
    waitForTimeout: jest.fn<(timeout: number) => Promise<void>>(),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
} as any;

describe('matchScreenshot', () => {
    beforeEach(() => {
        toHaveScreenshot.mockReset();
        getTestSlug.mockReset();
    });

    it('passes a string name so that Playwright sanitizes it', async () => {
        await matchScreenshot(page, { name: 'wide card: collapsed', pause: 0 });

        expect(toHaveScreenshot).toHaveBeenCalledWith('wide card: collapsed.png', {});
    });

    it('keeps the slug a separate path segment', async () => {
        getTestSlug.mockReturnValue('card-tests');

        await matchScreenshot(page, {
            name: 'collapsed',
            pause: 0,
            shouldPrependSlugToName: true,
        });

        expect(toHaveScreenshot).toHaveBeenCalledWith(['card-tests', 'collapsed.png'], {});
    });

    it('sanitizes the segments of a name that goes with a slug', async () => {
        getTestSlug.mockReturnValue('card tests');

        await matchScreenshot(page, {
            name: 'wide card: collapsed',
            pause: 0,
            shouldPrependSlugToName: true,
        });

        expect(toHaveScreenshot).toHaveBeenCalledWith(
            ['card-tests', 'wide-card-collapsed.png'],
            {},
        );
    });

    it('adds the theme to the name of every screenshot', async () => {
        await matchScreenshot(page, {
            name: 'collapsed',
            pause: 0,
            themes: ['light', 'dark'],
            onSwitchTheme: async () => undefined,
        });

        expect(toHaveScreenshot).toHaveBeenNthCalledWith(1, 'collapsed-light.png', {});
        expect(toHaveScreenshot).toHaveBeenNthCalledWith(2, 'collapsed-dark.png', {});
    });

    it('leaves the name to Playwright when it is not given', async () => {
        await matchScreenshot(page, { pause: 0 });

        expect(toHaveScreenshot).toHaveBeenCalledWith({});
    });
});
