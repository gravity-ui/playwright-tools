import type { ElementHandle, Locator, Page, PageScreenshotOptions } from '@playwright/test';
import { expect } from '@playwright/test';

import { globalSettings } from '../data/globalSettings';

import { getTestSlug } from './getTestSlug';

export type Theme = 'light' | 'dark';

export type OnSwitchThemeCallback = (theme: Theme, page: Page) => Promise<void>;

export type ScreenshotOptions = Omit<PageScreenshotOptions, 'type' | 'quality' | 'path'> & {
    /**
     * An acceptable ratio of pixels that are different to the total amount of pixels, between `0` and `1`. Default is
     * configurable with `TestConfig.expect`. Unset by default.
     */
    maxDiffPixelRatio?: number;

    /**
     * An acceptable amount of pixels that could be different. Default is configurable with `TestConfig.expect`. Unset by
     * default.
     */
    maxDiffPixels?: number;

    /**
     * An acceptable perceived color difference in the [YIQ color space](https://en.wikipedia.org/wiki/YIQ) between the same
     * pixel in compared images, between zero (strict) and one (lax), default is configurable with `TestConfig.expect`.
     * Defaults to `0.2`.
     */
    threshold?: number;
};

export type OnBeforeScreenshotCallback = (page: Page, options: ScreenshotOptions) => Promise<void>;

export type MatchScreenshotOptions = {
    /**
     * Элемент, который нужно скриншотить, или страница
     * @defaultValue `page`
     */
    locator?: Locator | Page;
    /**
     * Имя скриншота в тесте, можно не задавать для единственного скриншота
     * @defaultValue globalSettings.matchScreenshot.name
     */
    name?: string;
    /**
     * Параметры создания и сравнения скриншота (параметры вызова `toHaveScreenshot`)
     * @defaultValue globalSettings.matchScreenshot.options
     */
    options?: ScreenshotOptions;
    /**
     * CSS-селекторы (именно чисто CSS) элементов, которые нужно скрыть
     * @defaultValue globalSettings.matchScreenshot.hideBySelector
     */
    hideBySelector?: string[];
    /**
     * Пауза перед скриншотом (мс)
     * @defaultValue globalSettings.matchScreenshot.pause
     */
    pause?: number;
    /**
     * Использовать soft assertion
     * @defaultValue globalSettings.matchScreenshot.soft
     */
    soft?: boolean;
    /**
     * Увести курсор мыши в заданные координаты (чтобы избежать ненужного hover'а в скриншоте)
     */
    moveMouse?: { x: number; y: number } | [x: number, y: number] | number;
    /**
     * Нужно ли добавлять slug к имени файла скриншота
     * @defaultValue globalSettings.matchScreenshot.shouldPrependSlugToName
     */
    shouldPrependSlugToName?: boolean;
    /**
     * Темы, для которых необходимо снять скриншот
     * По-умолчанию скриншоты снимаются для текущей темы. Переключений не происходит
     * @defaultValue globalSettings.matchScreenshot.themes
     */
    themes?: Theme[];
    /**
     * Коллбек перед снятием скриншота. Полезно для каких-либо специальных стабилизирующих действий
     * @param page Page текущая страница
     * @defaultValue globalSettings.matchScreenshot.onBeforeScreenshot
     */
    onBeforeScreenshot?: OnBeforeScreenshotCallback;
    /**
     * Коллбек для переключения темы на страницы перед снятием скриншота
     * По-умолчанию переключает тему с помощью `page.emulateMedia({ colorScheme: theme });`
     * @param theme Theme Тема, для которой будет снят скриншот
     * @param page Page текущая страница
     * @defaultValue globalSettings.matchScreenshot.onSwitchTheme
     */
    onSwitchTheme?: OnSwitchThemeCallback;
};

const stylesForHide = /* css */ `{
    visibility: hidden !important;
    opacity: 0 !important;
}`;

/**
 * Выполняет проверку по скриншоту, с префиксом по slug теста в имени
 */
export async function matchScreenshot(
    page: Page,
    {
        locator = page,
        name = globalSettings.matchScreenshot.name,
        options = {},
        hideBySelector,
        pause = globalSettings.matchScreenshot.pause,
        soft = globalSettings.matchScreenshot.soft,
        moveMouse,
        shouldPrependSlugToName = globalSettings.matchScreenshot.shouldPrependSlugToName,
        themes = globalSettings.matchScreenshot.themes,
        onBeforeScreenshot = globalSettings.matchScreenshot.onBeforeScreenshot,
        onSwitchTheme = globalSettings.matchScreenshot.onSwitchTheme,
    }: MatchScreenshotOptions = {},
) {
    const combinedOptions = {
        ...globalSettings.matchScreenshot.options,
        ...options,
    };

    const styleElements: Array<ElementHandle<Node>> = [];

    const combinedHideBySelector = [
        ...(globalSettings.matchScreenshot.hideBySelector || []),
        ...(hideBySelector || []),
    ];

    if (combinedHideBySelector.length !== 0) {
        const selector = combinedHideBySelector.join(',');
        const styles = selector + stylesForHide;

        styleElements.push(await appendStylesToPage(page, styles));
    }

    if (options.style) {
        styleElements.push(await appendStylesToPage(page, options.style));
    }

    if (moveMouse) {
        let x = 0;
        let y = 0;

        if (typeof moveMouse === 'number') {
            x = y = moveMouse;
        } else if (Array.isArray(moveMouse)) {
            x = moveMouse[0];
            y = moveMouse[1];
        } else {
            x = moveMouse.x;
            y = moveMouse.y;
        }

        await page.mouse.move(x, y);
    }

    await onBeforeScreenshot?.(page, combinedOptions);

    const slug = getTestSlug(page);

    await page.waitForTimeout(pause);

    if (themes && themes.length) {
        for (const theme of themes) {
            await onSwitchTheme?.(theme, page);

            const resolvedName = name ? `${name}-${theme}` : undefined;

            await doMatchScreenshot({
                locator,
                name: resolvedName,
                slug,
                options: combinedOptions,
                shouldPrependSlugToName,
                soft,
            });
        }
    } else {
        await doMatchScreenshot({
            locator,
            name,
            slug,
            options: combinedOptions,
            shouldPrependSlugToName,
            soft,
        });
    }

    for (const styleElement of styleElements) {
        await styleElement.evaluate((element: Element) => element.remove());
        await styleElement.dispose();
    }
}

async function doMatchScreenshot(params: {
    locator: Locator | Page;
    name?: string;
    slug: string;
    options: ScreenshotOptions;
    shouldPrependSlugToName: boolean;
    soft: boolean;
}): Promise<void> {
    const { locator, name, slug, options, shouldPrependSlugToName, soft } = params;
    const resolvedName = resolveScreenshotName({ name, slug, shouldPrependSlugToName });
    const resolvedExpect = soft ? expect.soft : expect;

    if (resolvedName) {
        await resolvedExpect(locator).toHaveScreenshot(resolvedName, options);
    } else {
        await resolvedExpect(locator).toHaveScreenshot(options);
    }
}

function resolveScreenshotName(params: {
    name?: string;
    slug: string;
    shouldPrependSlugToName: boolean;
}) {
    const { name, slug, shouldPrependSlugToName } = params;

    if (!name) {
        return undefined;
    }

    const resolvedName = [name + '.png'];

    if (shouldPrependSlugToName) {
        resolvedName.unshift(slug);
    }

    return resolvedName;
}

async function appendStylesToPage(page: Page, styles: string) {
    return await page.addStyleTag({ content: styles });
}
