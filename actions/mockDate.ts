import { resolve } from 'path';

import type { Page } from '@playwright/test';
import type { default as Timekeeper } from 'timekeeper';

import { globalSettings } from '../data/globalSettings';

type WindowWithTimekeeper = typeof window & {
    timekeeper: typeof Timekeeper;
};

/**
 * NOTE:
 * Replaces the Date object with an object in which the date is set to the specified one.
 *
 * The date and time are not fixed, but go at the usual speed, but starting from the specified one.
 *
 * Use playwright API Clock https://playwright.dev/docs/clock
 */
export async function mockDate(
    page: Page,
    year = globalSettings.mockDate.defaultDate.year,
    month = globalSettings.mockDate.defaultDate.month,
    day = globalSettings.mockDate.defaultDate.day,
    hour = globalSettings.mockDate.defaultDate.hour,
    min = globalSettings.mockDate.defaultDate.min,
    sec = globalSettings.mockDate.defaultDate.sec,
) {
    await page.addInitScript({ path: resolve(require.resolve('timekeeper')) });
    await page.addInitScript(
        ({
            year,
            month,
            day,
            hour,
            min,
            sec,
        }: {
            year: number;
            month: number;
            day: number;
            hour: number;
            min: number;
            sec: number;
        }) => {
            const date = new Date(year, month, day, hour, min, sec);

            (window as WindowWithTimekeeper).timekeeper.travel(date);
        },
        { year, month, day, hour, min, sec },
    );
}
