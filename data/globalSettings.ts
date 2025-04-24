import type { Page } from '@playwright/test';

import type { Config } from '../actions/collectPageActivity';
import {
    defaultIgnoredMessageTypes,
    defaultIgnoredResponseStatuses,
} from '../actions/collectPageActivity/constants';
import type {
    OnBeforeScreenshotCallback,
    OnSwitchThemeCallback,
    ScreenshotOptions,
    Theme,
} from '../actions/matchScreenshot';

const collectPageActivity: Pick<
    Required<Config>,
    | 'ignoredMessageTypes'
    | 'expectedMessages'
    | 'ignoredResponseStatuses'
    | 'expectedResponses'
    | 'requestIdHeader'
> = {
    ignoredMessageTypes: defaultIgnoredMessageTypes,
    expectedMessages: [
        {
            type: 'error',
            text: /^Failed to load resource: the server responded with a status of/,
        },
    ],
    ignoredResponseStatuses: defaultIgnoredResponseStatuses,
    expectedResponses: [],
    requestIdHeader: 'x-request-id',
};

/**
 * Глобальные настройки для команд
 */
export const globalSettings = {
    /**
     * actions/assertElementsHidden
     */
    assertElementsHidden: {
        defaultWaitForVisibleTimeout: 300,
    },
    /**
     * actions/matchScreenshot
     */
    matchScreenshot: {
        /**
         * Параметры создания и сравнения скриншота.
         * Будут объединены с переданными при вызове.
         */
        options: {} as ScreenshotOptions,
        /**
         * CSS-селекторы (именно чисто CSS) элементов, которые нужно скрыть.
         * Будут объединены с переданными при вызове.
         */
        hideBySelector: undefined as string[] | undefined,
        /**
         * Пауза перед скриншотом (мс)
         */
        pause: 1000,
        /**
         * Использовать soft assertion
         */
        soft: true,
        /**
         * Имя скриншота по-умолчанию
         */
        name: 'plain' as string | undefined,
        /**
         * Нужно ли добавлять slug к имени файла скриншота
         */
        shouldPrependSlugToName: true,
        /**
         * Темы, для которых необходимо снять скриншот
         * По-умолчанию скриншоты снимаются для текущей темы. Переключений не происходит
         */
        themes: undefined as Theme[] | undefined,
        /**
         * Коллбек перед снятием скриншота. Полезно для каких-либо специальных стабилизирующих действий
         * @param page Page текущая страница
         */
        onBeforeScreenshot: undefined as OnBeforeScreenshotCallback | undefined,
        /**
         * Коллбек для переключения темы на страницы перед снятием скриншота
         * По-умолчанию переключает тему с помощью `page.emulateMedia({ colorScheme: theme });`
         * @param theme Theme Тема, для которой будет снят скриншот
         * @param page Page текущая страница
         */
        onSwitchTheme: (async (theme: Theme, page: Page) => {
            await page.emulateMedia({ colorScheme: theme });
        }) as undefined | OnSwitchThemeCallback,
    },
    /**
     * actions/mockDate
     */
    mockDate: {
        /**
         * Дата по-умолчанию
         */
        defaultDate: {
            year: 2020,
            month: 7,
            day: 15,
            hour: 12,
            min: 0,
            sec: 0,
        },
    },
    /**
     * utils/waitForResolve
     */
    waitForResolve: {
        /**
         * Интервал между проверками (мс)
         */
        interval: 100,
        /**
         * Таймаут, после которого проверки прерываются (мс)
         * `0` — без ограничения
         */
        timeout: 5000,
    },

    collectPageActivity,

    waitForNetworkSettled: {
        /** Время таймаута после запроса */
        delay: 0,
    },
} satisfies Record<string, object>;

export type GlobalSettings = typeof globalSettings;
export type PartialGlobalSettings = {
    [Key in keyof GlobalSettings]?: Partial<GlobalSettings[Key]>;
};
