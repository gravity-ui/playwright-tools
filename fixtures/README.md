# Фикстуры

## expectRequest

Позволяет проверить, выполнялся ли запрос на какой-либо эндпоинт с заданными параметрами.

Расширяем `test` в Playwright:

```ts
import { expectRequest, type ExpectRequestFn } from '@yandex-data-ui/playwright-utils/fixtures';

export type TestExtraFixtures = {
    expectRequest: ExpectRequestFn;
};

export const test = baseTest.extend<TestExtraFixtures, WorkerExtraFixtures>({
    expectRequest,
});
```

Использование в тесте:

```ts
test('Some random test', async ({ page, expectRequest }) => {
    ...

    await expectRequest(
        '**/some/cool/endpoint',
        {
            method: 'POST',
            query: { foo: 'bar' },
            body: {
                param1: 'value1',
                param2: { param3: 'value3' },
            },
        },
        {
            timeout: 10000,
            exact: true,
        },
    );
});
```

Детали работы и описания параметров см. в описании action'a [expectRequest](../actions/README.md#expectrequest).

## expectScreenshot

Позволяет выполнить проверку с помощью скриншота

Расширяем `test` в Playwright:

```ts
import { expectScreenshotBuilder, type ExpectScreenshotFn } from '@yandex-data-ui/playwright-utils/fixtures';

const expectScreenshot = expectScreenshotBuilder({
    screenshotOptions: {
        animations: 'disabled',
    },
    soft: true,

    themes: ['dark', 'light'],
})

export type TestExtraFixtures = {
    expectScreenshot: ExpectScreenshotFn;
};

export const test = baseTest.extend<TestExtraFixtures, WorkerExtraFixtures>({
    expectScreenshot,
})
```

Использование в тесте:

```ts
test('Some random test', async ({ page, expectScreenshot }) => {
    ...

    await expectScreenshot();
});
```

Детали работы и описания параметров см. в описании action'a [matchScreenshot](../actions/README.md#matchScreenshot).

Дополнительные параметры `expectScreenshot`:

```ts

type ExpectScreenshotParams = MatchScreenshotParams & {
    /**
     * Нужно ли использовать маску по-умолчанию при снятии скриншота
     * Сама маска берётся из коллбека `getDefaultMask`
     * @default true
     */
    shouldUseDefaultMask?: boolean;
}
```

Параметры `expectScreenshotBuilder`: 

```ts
type ExpectScreenshotFixtureBuilderParams = {
    /**
     * Параметры создания и сравнения скриншота (параметры вызова `toHaveScreenshot`)
     */
    options?: ScreenshotOptions;
    /**
     * CSS-селекторы (именно чисто CSS) элементов, которые нужно скрыть
     */
    hideBySelector?: string[];
    /**
     * Пауза перед скриншотом (мс)
     * @defaultValue `1000`
     */
    pause?: number;
    /**
     * Использовать soft assertion
     * @defaultValue `true`
     */
    soft?: boolean;
    /**
     * Нужно ли добавлять slug к имени файла скриншота
     * @default true
     */
    shouldPrependSlugToName?: boolean;
    /**
     * Темы, для которых необходимо снять скриншот
     * По-умолчанию скриншоты снимаются для текущей темы. Переключений не происходит
     */
    themes?: Theme[];
    /**
     * Коллбек перед снятием скриншота. Полезно для каких-либо специальных стабилизирующих действий
     * @param page Page текущая страница
     */
    onBeforeScreenshot?: (page: Page) => Promise<void>;
    /**
     * Коллбек для переключения темы на страницы перед снятием скриншота
     * По-умолчанию переключает тему с помощью `page.emulateMedia({ colorScheme: theme });`
     * @param theme Theme Тема, для которой будет снят скриншот
     * @param page Page текущая страница
     */
    onSwitchTheme?: (theme: Theme, page: Page) => Promise<void>;
    /**
     * Коллбек для получения маски по-умолчанию. По данной маске будут скрыты элементы перед тестом 
     * Маска будет применяться в случае, если другая маска не передана в тест
     * @param page Page текущая страница
     * 
     * @returns Locator[] список локаторов, которые необходимо скрыть
     */
    getDefaultMask?: (page: Page) => Locator[];
};
```

## mockNetwork

Упрощает настройку моков данных для интеграционных тестов.
При включении фикстуры все запросы, попадающие под переданное регулярное выражение будут записаны в .har и воспроизведены при повторном прогоне тестов

Расширяем `test` в Playwright:

```ts
import { mockNetworkFixtureBuilder } from '@yandex-data-ui/playwright-utils/fixtures';

export type TestExtraFixtures = {
    isNetworkMocked: boolean;
};

// Признак того, записываются ли сейчас запросы или считываются, необходимо передавать извне. Название UPDATE_DUMPS выбрано для примера
const NEED_TO_UPDATE = process.env.UPDATE_DUMPS;

const mockNetwork = mockNetworkFixtureBuilder({
    shouldUpdate: NEED_TO_UPDATE,
    forceUpdateIfHarMissing: !process.env.CI,

    url: (baseURL) => {
        const url = baseURL.replace(/\/+$/, '');

        return new RegExp(
            `^${escapeStringRegExp(url)}/(gateway|_/node|_/serverless|_/ydb-document-proxy)/`,
            'i',
        );
    },
    zip: true,

    headersToRemove: ['set-cookie'],
});

export const test = baseTest.extend<TestExtraFixtures, WorkerExtraFixtures>({
    isNetworkMocked: mockNetwork,
});
```

Теперь тесты будут выполняться на записанных данных. В самих тестах признак, замокана ли сеть, можно получить следующим образом:

```ts
test('Some random test', async ({ page, isNetworkMocked }) => {
    // isNetworkMocked === true
});
```

Параметры `mockNetworkBuilder`:

```ts
type MockNetworkFixtureBuilderParams = {
    /**
     * Обновлять дампы или нет
     * @defaultValue `false`
     */
    shouldUpdate: boolean;

    /**
     * Всегда обновлять дампы, если они отсутствуют
     * @defaultValue `false`
     */
    forceUpdateIfHarMissing?: boolean;

    /**
     * Пользовательский таймаут для обновления тестов. Миллисекунды.
     * Полезно при долгих обновлениях
     */
    updateTimeout?: number;

    /**
     * Архивировать дампы
     * @defaultValue true
     */
    zip?: boolean;

    /**
     * Шаблон адреса запросов, которые будут записаны в .har. Неподходящие запросы будут пропущены.
     * @param baseURL string Базовый адрес страницы.
     * @returns string | RegExp Подготовленный шаблон; Glob or RegExp.
     */
    url: (baseURL: string) => string | RegExp;

    /**
     * Путь к дампам теста. 
     * По-умолчанию путь вычисляется как По-умолчанию путь вычисляется как testInfo.snapshotPath('').replace(/-snapshots\/[^/]+$/, '-data/' + slug)
     * Для возврата к поведению pwt по-умолчанию, переопределите как (testInfo) => testInfo.snapshotPath()

     * @param testInfo TestInfo информация о текущем тесте
     * @param slug slug теста
     * @returns string путь к дампам теста
     */
    dumpsPath?: (testInfo: TestInfo, slug: string) => string;

    /**
     * Дополнительные заголовки, которые будут удалены перед записью запроса в .har
     * По-умолчанию удаляются следующие заголовки: `cookie`, `x-csrf-token`, `content-security-policy`, `Session_id`
     */
    headersToRemove?: string[];

    /**
     * Дополнительные значения set-cookie, для которых будут удалены заголовки set-cookie
     * По-умолчанию удаляются set-cookie для следующих значений: с`CSRF-TOKEN`
     */
    setCookieToRemove?: string[];

    /**
     * Колбек для обработки запросов и ответов сохранением в .har. Полезно для различной пост-обработки запросов: очистки, изменения формата и тд.
     * По-умолчанию удаляются чувствительные заголовки + base url запроса изменяется на заглушку
     * @param entry Вхождение в .har, которое будет записано
     */
    onHarEntryWillWrite?: (entry: Entry) => void;

    /**
     * Коллбек для обработки записанных в .har запросов и ответов перед тем, как они будут использованы
     * Полезно для возврата изменений, произведённых в onHarEntryWillWrite
     * По-умолчанию болванки base url заменяются на актуальные baseUrl теста
     * @param entry Вхождение в .har, которое будет использовано
     */
    onHarEntryWillRead?: (entry: Entry) => void;

    /**
     * Коллбек для изменения параметров поиска запросов в .har
     */
    onTransformHarLookupParams?: HarLookupParamsTransformFunction;

    /**
     * Коллбек для трансформации результата поиска запроса в .har
     */
    onTransformHarLookupResult?: HarLookupResultTransformFunction;
};
```

## globalSettings

Фикстура для управления глобальными настройками playwright-utils. Позволяет настроить глобальные дефолты и даёт возможность управлять ими из теста

Расширяем `test` в Playwright:

```ts
import type { GlobalSettingsTestArgs, GlobalSettingsWorkerArgs, } from '@yandex-data-ui/playwright-utils/fixtures';
import { globalSettingsFixturesBuilder } from '@yandex-data-ui/playwright-utils/fixtures';

export type TestExtraFixtures = GlobalSettingsTestArgs;
export type WorkerExtraFixtures = GlobalSettingsWorkerArgs;

const globalSettingsFixtures = globalSettingsFixturesBuilder({
    globalSettings: {
        matchScreenshot: {
            pause: 1500, // 1500 ms pause before taking screenshot
        },    
    }
});

export const test = baseTest.extend<TestExtraFixtures, WorkerExtraFixtures>({
    ...globalSettingsFixtures
});
```

Теперь при старте воркера будут применены дефолты выше. Также в тестах и других фикстурах нам доступна возможность управления глобальными настройками:

```ts
test('Some test', async ({ getGlobalSettings, setGlobalSettings }) => {
    // test code here
});
```

## testSlug

Автоматически выставляет и добавляет в фикстуры теста текущее значение slug для теста.
Использует внутри `setTestSlug` и `getTestSlug`.

Расширяем `test` в Playwright:

```ts
import type { TestSlugResult } from '@yandex-data-ui/playwright-utils/fixtures';
import { testSlug } from '@yandex-data-ui/playwright-utils/fixtures';

export type TestExtraFixtures = {
    testSlug: TestSlugResult;
};

export const test = baseTest.extend<TestExtraFixtures, WorkerExtraFixtures>({
    testSlug,
});
```

Теперь в тестах и других фикстурах нам доступно значение `testSlug`:

```ts
test('Some my test [test-slug]', async ({ page, testSlug }) => {
    // testSlug === 'test-slug'
});
```
