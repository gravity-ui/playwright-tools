# Действия в браузере

## assertElementsHidden

Доживается скрытия всех элементов, подходящих под локатор.

Опционально проверяет, что элемент сначала был видимым (дождаться появления). Если элемент не стал видим по прошествии таймаута (300 мс по-умолчанию), то считается что он успел скрыться до этого, ошибку это не вызывает.

Параметры:

- `locator: Locator` — Локатор элементов, которые должны скрыться
- `waitForVisible?: boolean | number = false` — Включить проверку, что изначально присутствует (при `true` — с таймаутом по-умолчанию, при числе — с заданным)

## disableAnimations

Отключает анимацию в CSS. отключение выполняется путём выставления на все элементы длительности в 1 мс и отключения задержки и повторов.

Параметры:

- `page: Page` — объект страницы, в котором будут созданы стили.
- `allowFor?: string[]` — CSS-селекторы элементов, для которых нужно разрешить анимацию.

## disableMetrika

Отключает выбранные счётчики Метрики через [стандартное апи](https://yandex.ru/support/metrica/general/user-opt-out.html).

```ts
await disableMetrika(page, [/* номера счётчиков Метрики */]);
```

Параметры:

- `counters`: массив чисел, номера счётчиков метрики

## getTestSlug

Возвращает идентификатор (slug) теста. Slug — это короткое, пригодное для использования в именах файлов, альтернативное название теста, которое используется в конце названия теста в квадратных скобках:

```ts
test('My test title [my-test]', () => {})
```

Здесь `slug === 'my-test'`.

Slug хранится с привязкой к проекту. Предполагается, что он заполняется в [`initTest`](../example/initTest.ts) с помощью функции `setTestSlug`.

Если у теста не задан slug в квадратных скобках, то будет использован сам title. Смотри [`extractTestSlug`](../utils/README.md#extractTestSlug).

## setTestSlug

Устанавливает идентификатор (slug) теста.

Параметры:

- `page: Page` — объект страницы, для которого будет сохранён slug.
- `title: string` — Название теста, из которого будет извлечён slug.
- `required: boolean = false` — Требуется, чтобы в названии был указан slug специальным образом (иначе будет использован сам title).

Удобно вызывать в [`initTest`](../example/initTest.ts):

```ts
setTestSlug(page, testInfo.title)
```

## matchScreenshot

Выполняет проверку по скриншоту, с префиксом по slug теста в имени.  
Прямой вызов `toHaveScreenshot` сохраняет скриншот в общую директорию скриншотов данного файла тестов. Функция `matchScreenshot` создаёт поддиректорию по данному тесту, используя его slug. Это позволяет легче управляться и поддерживать скриншоты, так как сразу видно, к какому тесту они относятся.

Функция использует вызов `getTestSlug`.

Также, имеет некоторые другие встроенные инструменты.

По-умолчанию скриншоты проверяются как soft assertion, чтобы помимо упавшего визуального сравнения получить дополнительную информацию о несоответствии теста. Но это поведение можно поменять, указав параметр `soft` как `false`.

Поддерживается снятие скриншотов для нескольких тем: light, dark

Принимает объект с параметрами:

```ts
type MatchScreenshotOptions = {
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
    onBeforeScreenshot?: (page: Page) => Promise<void>;
    /**
     * Коллбек для переключения темы на страницы перед снятием скриншота
     * По-умолчанию переключает тему с помощью `page.emulateMedia({ colorScheme: theme });`
     * @param theme Theme Тема, для которой будет снят скриншот
     * @param page Page текущая страница
     * @defaultValue globalSettings.matchScreenshot.onSwitchTheme
     */
    onSwitchTheme?: (theme: Theme, page: Page) => Promise<void>;
};
```

## expectRequest

Позволяет проверить, выполнялся ли запрос на какой-либо эндпоинт с заданными параметрами.

```ts

const requests = new Map<string, Request>

...

await expectRequest(
    requests,
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
)
```

Поддерживается проверка метода запроса, query-параметров и тела.

Для query-параметров и тела поддерживаются 2 режима проверки:

- полное соответствие (deepEqual): если запрос содержит все ожидаемые параметры И какие-то дополнительные, то проверка **не будет** пройдена
- частичное вхождение: если запрос содержит все ожидаемые параметры И какие-то дополнительные, то проверка **будет** пройдена

Параметры:

- `requests: Map<string, Request>`: коллекция запросов, которые были отправлены во время работы теста. Можно собрать, подписавшись на событие страницы `page.on('request, (data) => {...})`. **ВАЖНО**: ожидаемый формат ключей в `requests`: `${url.protocol}//${url.hostname}${url.pathname}`. В случае несоблюдения работоспособность не гарантируется
- `url: string | RegExp`: url, запрос на который ожидается. Поддерживаются glob'ы и регулярные выражения
- `matcher`: предикаты, по которым сравниваются параметры запроса. Если предикат не задан, то запрос считается попадающим под условия.
    - `matcher.method: HttpMethod`: допустимый HTTP-метод
    - `matcher.query: string | Record<string, string | string[]>`: query параметры запроса. Поддерживается как передача в виде qs-строки (`?foo=bar&fizz=bazz`), так и виде коллекции
    - `matcher.body: Json`: тело запроса в виде JSON
- `options`: настройки ассертера
    - `options.timeout: number`: таймаут ассерта
    - `options.exact: boolean`: режим проверки. В случае включения, query-параметры и тело запроса будут проверяться на полное соответствие

## collectPageActivity

Утилита для того что бы убедиться в отсутствиии на странице ошибок в сетевых запросах и в консоли. Возвращает метод для отписки страницы от обработчиков и результаты наблюдения за страницей.

```ts
const baseUrl = 'https://test.com';

// Начинаем следить за активностью
const {results, unsubscribe} = await collectPageActivity(page, {
    baseUrl,
    // Ожидаем что это нормально если на странице в консоль выводится какое-то логирование
    expectedMessages: ['log']
});

// Ждём когда страница перестанет создавать запросы
await waitForNetworkSettled(page, () => page.goto(baseUrl));

// Убираем обработчики со страницы
unsubscribe();

// Проверяем что в результатах наблюдений нет ничего что мы не ожидали
expect(results).toEqual({
    uncaughtErrors: [],
    pageCrashes: [],
    unexpectedMessages: [],
    failedResponses: [],
});
```

Можно управлять тем что должно считаться падением через опции

Параметры:

- `baseUrl`: строка, __обязательный аргумент__ с ссылкой на стенд, который ассертится, используется для конструирования урлов
- `ignoredMessageTypes`: массив с типами запросов в консоль, которые должны игнорироваться, смотри тип ConsoleMessage.type
- `expectedMessages`: массив сообщений в консоль, которые считаются ожидаемыми, объект содержит:
    - `type`: тип сообщения, смотри тип ConsoleMessage.type
    - `text`: строка или регулярное выражение, с которым сравнивается текст сообщения в консоли
- `ignoredResponseStatuses`: массив чисел, коды ответа которые игнорируются и не считаются проблемными, по-умолчанию только код 200 игнорируется
- `expectedResponses`: массив объектов, позволяет перечислить ответы от сервера, которые не будут добавляться в итоговые результаты, каждый объект должен содержать:
    - `status`: число, статус ответа
    - `url`: строка с абсолютным урлом, будет склеена с `baseUrl` для сравнения
- `requestIdHeader`: строка, имя заголовка, в котором приходит идентификатор запроса

## waitForNetworkSettled

Утилита для проверки завершения всех запросов после выполнения переданного экшена.

```ts
await waitForNetworkSettled(page, async () => {
    await page.getByRole('link', {name: 'Foobar'});
});
```

Можно передать третьим аргумент объект с опциями.

Параметры:

- `networkSettleDelay`: задержка, которая будет выставляться после завершения каждого запроса происходящего на странице.

## mockDate

Подменяет объект Date объектом, в котором дата выставлена на указанную.  
Дата и время не фиксируются, а идут с обычной скоростью, но начиная с указанной.

Нужно вызывать **до** перехода на страницу, где требуется подделать время, чтобы все скрипты, которые будут выполняться, работали с уже подменённым объектом `Date`.

```ts
async function mockDate(
    page: Page,
    year = 2020,
    month = 7,
    day = 15,
    hour = 12,
    min = 0,
    sec = 0,
)
```

## Выставление дополнительных заголовков

Встроенная команда `setExtraHTTPHeaders`, доступная в `Page` и `BrowserContext`, даёт возможность только выставлять список дополнительных заголовков целиком. Если нужно выставлять заголовки не все сразу, а в разных местах кода, то она не подходит, так как даже не даёт возможности получить текущий перечень уже выставленных заголовков. Можно только переназначить весь список, добавить новый элемент нельзя.

Добавлено несколько команд, которые управляют хранимым внутри списком заголовков. Заголовки хранятся с привязкой к контексту браузера и ставятся на него. Контекст уникален для каждого теста, но общих на все страницы (`Page`) в этом тесте.

Все команды работают только со своим внутренним списком заголовков, и при изменении выставляет их на browserContext через `setExtraHTTPHeaders`.

**Общие параметры:**

- `browserContext: BrowserContext` — Контекст браузера, можно получить через `page.context()`.
- `headerName: string` — Название заголовка.
- `headerValue: string` — Значение, которое нужно записать для заданного заголовка.
- `additionalHeaders: Record<string, string>` — Перечень заголовков, которые нужно добавить.

Название заголовка всегда приводится к нижнему регистру.

### addExtraHttpHeader

Добавляет заголовок `headerName` со значением `headerValue` в список дополнительных заголовков.

```ts
async function addExtraHttpHeader(
    browserContext: BrowserContext,
    headerName: string,
    headerValue: string,
): Promise<void>
```

### addExtraHttpHeaders

Позволяет добавить сразу несколько заголовков в список дополнительных заголовков.

```ts
async function addExtraHttpHeaders(
    browserContext: BrowserContext,
    additionalHeaders: Record<string, string>,
): Promise<void>
```

### hasExtraHttpHeader

Позволяет проверить, добавлен ли уже заголовок в список дополнительных заголовков.

Проверяет только внутренний список для этих команд.

```ts
function hasExtraHttpHeader(
    browserContext: BrowserContext, 
    headerName: string
): boolean
```

### getExtraHttpHeader

Возвращает значение заголовка из списка дополнительных заголовков, если есть.

```ts
function getExtraHttpHeader(
    browserContext: BrowserContext, 
    headerName: string
): string | undefined
```

### getExtraHttpHeaders

Возвращает перечень всех заголовков, из списка дополнительных заголовков.

```ts
function getExtraHttpHeaders(
    browserContext: BrowserContext
): Record<string, string>
```

### removeExtraHttpHeader

Удаляет заголовок из списка дополнительных заголовков.

```ts
async function removeExtraHttpHeader(
    browserContext: BrowserContext,
    headerName: string,
): Promise<void>
```

### clearExtraHttpHeaders

Очищает список дополнительных заголовков.

```ts
async function clearExtraHttpHeaders(
    browserContext: BrowserContext
): Promise<void>
```

## Управление глобальными настройками

Глобальные настройки позволяют поменять поведение по-умолчанию для функций из набора playwright-utils.

Глобальные настройки являются объектом, в котором ключ — это раздел настроек (обычно соответствует команде), а значение — объект с настройками данного раздела.

При переназначении настроек, разделы объединяются, настройки по разделу также объединяются, но поверхностно, значение внутри настроек раздела считается заданным заново.

### Что можно поменять через глобальные настройки

```ts
{
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
         */
        onBeforeScreenshot: undefined as (OnBeforeScreenshotCallback | undefined,
        /**
         * Коллбек для переключения темы на страницы перед снятием скриншота
         * По-умолчанию переключает тему с помощью `page.emulateMedia({ colorScheme: theme });`
         */
        onSwitchTheme: async (theme: Theme, page: Page) => {
            await page.emulateMedia({ colorScheme: theme });
        },
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
}
```

### getGlobalSettings

Возвращает глобальные настройки для команд по заданному разделу (команде).

Параметры:

- `section` — название одного из доступных разделов.

### setGlobalSettings

Устанавливает глобальные настройки для команд.

Объект с настройками раздела объединяется поверхностно, без глубокого объединения.

То есть объект с настройками

```js
{
    matchScreenshot: {
        options: {
            threshold: 0.2,
        },
    },
}
```

перезапишет целиком значение `options` в разделе `matchScreenshot` на новый объект, в котором содержится только `threshold: 0.2`.

## Управление кэшем

Для настройки кэширования на файловую систему существует функция `setCacheSettings`. С помощью неё, по некоторому ключу задаются настройки для соответствующей сущности.

По-умолчанию кэширования на диск не производится. Для включения кэширования, нужно задать `path`.

### Что можно настроить для кэширования

```ts
{
    /**
     * Кэширование данных аутентификации
     */
    auth: {
        /**
         * Путь до директории, где должны храниться файлы кэша
         */
        path: undefined as string | undefined,
        /**
         * Время жизни кэша
         */
        ttl: 30 * 60 * 1000,
    },
}
```

### setCacheSettings

Устанавливает параметры кэширования на файловой системе.

Параметры:

- `key` — ключ сущности для настройки.
- `options` — параметры.
