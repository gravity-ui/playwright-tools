# Функции для работы с дампами запросов в формате HAR

Механизм дампов запросов, встроенный в Playwright, позволяет сохранить все запросы, которые выполняются в ходе теста, и записать их в файл в формате HAR. Сохраняются как параметры самого запроса, так и полученный ответ. После этого можно переключиться на режим чтения из этого файла, вместо выполнения реальных запросов.

Всё это позволяет написать интеграционные тесты только фронтовую часть, проверяя работу кода в браузере. Отключение бэкенда с изменяющимися данными делает тесты более стабильными.

## Рецепты

### Подключение механизма

Нужно выполнять `initDumps` для каждого теста, где требуется добавить работу с дампами. Для этих целей у нас в проекте есть файл [`initTest.ts`](../example/initTest.ts). Добавляем туда:

```ts
import { initDumps } from '@yandex-data-ui/playwright-utils/har';

// …

// Условие, по которому работает без дампов, если нужно.
if (!process.env.E2E) {
  // Важный момент: нужно указать паттерн запросов, которые должны перехватываться и сохраняться.
  // Скорее всего, нам нужно захватывать все запросы, кроме запросов за статикой,
  // поэтому мы используем негативную опережающую проверку вокруг подшаблона регулярного выражения.
  // То есть указываем те, которые захватывать не нужно.
  const template = String.raw`^(?!.+\.(?:js|css)$|${escapeStringRegExp(
    baseURL,
  )}/(?:build|static)/.|https?://(?:storage.yandexcloud.net|yastatic.net)/.)`;
  const urlRegExp = new RegExp(template, 'i');

  await initDumps(page, testInfo, {
    // Это переменная окружения, с помощью которой мы включаем режим записи дампов.
    update: Boolean(process.env.PLAYWRIGHT_UPDATE_DUMPS),
    // Построенное выше регулярное выражение для выбора URL для сохранения.
    url: urlRegExp,
    // Результат сохраняем в виде архива (если не укажем, то будет набор файлов).
    zip: true,
  });
}
```

Теперь запускаем тест на запись дампов:

```sh
PLAYWRIGHT_UPDATE_DUMPS=1 npx playwright test
```

Далее запускаем уже без переменной окружения: будет работать на сохранённых запросах.

### Файл для патчей

Для прочих манипуляций, нам нужно будет воспользоваться функциями, которые вносят изменения в рантайме.

Для удобства создадим файл `playwright-patches.ts`, который импортируем в файле `playwright.config.ts`, передав туда сформированный конфиг:

```ts
import { playwrightPatches } from './playwright-patches';

// …

playwrightPatches(config);

export default config;
```

В самом `playwright-patches.ts` создаём функцию, которая принимает конфиг:

```ts
import type { PlaywrightTestConfig } from '@playwright/test';
import type { TestExtraFixtures, WorkerExtraFixtures } from '~/tests/playwright';

export function playwrightPatches(
  config: PlaywrightTestConfig<TestExtraFixtures, WorkerExtraFixtures>,
) {}
```

### Вырезаем заголовки

Самих кук в дампах не будет, но могут быть заголовки, которые их передают и устанавливают. Некоторые из них нужно скрыть, например сессионную. Добавим вырезание любых кук, которые передаются с запросами, а также уберём заголовок CSRF-токена и выставление его через куку.

В файле `playwright-patches.ts` добавляем:

```ts
import { addHarRecorderTransform } from '@yandex-data-ui/playwright-utils/har';
import { clearHeaders } from '@yandex-data-ui/playwright-utils/har';

const removeHeaders = new Set(['cookie', 'x-csrf-token']);
const removeSetCookieFor = new Set(['CSRF-TOKEN']);

export function playwrightPatches(
  config: PlaywrightTestConfig<TestExtraFixtures, WorkerExtraFixtures>,
) {
  addHarRecorderTransform((entry) => {
    entry.request.headers = clearHeaders(entry.request.headers, {
      removeHeaders,
    });
    entry.response.headers = clearHeaders(entry.response.headers, {
      removeHeaders,
      removeSetCookieFor,
    });
  });
}
```

### Подменяем base URL в дампах

Обычно хост, на котором выполняются тесты, меняется при запуске этих тестов на разные окружения. Локально, когда мы записываем тесты, он будет один, на стенде — другой, а в релизе — тоже свой. Но в дампе в запросах будет сохранён конкретных хост.

Чтобы решить эту проблему, добавим код, который при записи заменяет текущий baseURL на плейсхолдер, а при считывании восстанавливает в актуальный baseURL.

В файле `playwright-patches.ts` добавляем:

```ts
import { addHarRecorderTransform } from '@yandex-data-ui/playwright-utils/har';
import { addHarOpenTransform } from '@yandex-data-ui/playwright-utils/har';
import { replaceBaseUrlInEntry } from '@yandex-data-ui/playwright-utils/har';

const baseUrlPLaceholder = 'https://base.url.placeholder';

export function playwrightPatches(
  config: PlaywrightTestConfig<TestExtraFixtures, WorkerExtraFixtures>,
) {
  const baseUrl = config.use?.baseURL;

  if (!baseUrl) {
    throw new Error('baseURL should be specified in playwright config');
  }

  addHarRecorderTransform((entry) => {
    replaceBaseUrlInEntry(entry, baseUrl, baseUrlPLaceholder);
  });

  addHarOpenTransform((harFile) => {
    const entries = harFile.log.entries;

    for (const entry of entries) {
      replaceBaseUrlInEntry(entry, baseUrlPLaceholder, baseUrl);
    }
  });
}
```

### Вносим изменения в HTML страницы

Сложным моментом может быть ситуация, когда на HTML загружаемой страницы помещаются какие-то данные при её запросе с сервера. Тогда нужно страницу добавлять в кэш дампов. Но если на стенде для неё что-то меняется (например, перечень подключённых скриптов), то нужно запрашивать актуальную страницу со стенда. Получается, нужно запросить актуальную страницу, но при этом добавить в неё что-то из дампа.

```ts
import { addHarLookupTransform } from '@yandex-data-ui/playwright-utils/har';

export function playwrightPatches(config: PlaywrightTestConfig<TestExtraFixtures, WorkerExtraFixtures>) {
    const baseUrl = config.use?.baseURL;

    if (!baseUrl) {
        throw new Error('baseURL should be specified in playwright config');
    }

    // Обрабатываем найденные запросы
    addHarLookupTransform(undefined, async (result, params) => {
        // Завершённый запрос с телом
        if (result.action !== 'fulfill' || !result.body) {
            return result;
        }

        const type = result.headers?.find((header) => header.name.toLowerCase() === 'content-type');

        // Это именно HTML
        if (!type?.value.startsWith('text/html')) {
            return result;
        }

        const body = result.body.toString('utf8');

        // С не-пустым телом
        if (!body) {
            return result;
        }

        // Выполняем нашу функцию, которая сделает нужные замены и вернёт новый вариант тела
        const nextBody = await transformHtml(body, baseUrl, params.headers);

        // Записываем новое тело ответа в результат, подменив тело из дампа
        if (nextBody) {
            result.body = Buffer.from(nextBody, 'utf8');
        }

        return result;
    });
```

### Два одинаковых запроса в рамках теста

Бывает что в рамках теста два раза выполняется какое-то действие, которое порождает одинаковый по параметрам запрос, но с разным результатом (мы что-то поменяли, и результат теперь должен прийти другой).

Playwright будет искать в дампах первый подходящий запрос, поэтому при воспроизведении мы и на второе срабатывание получим результат от первого.

Чтобы этого избежать, можно искусственным образом добавить разница в запрос. Проще всего это сделать, добавив кастомный заголовок. Для этого есть специальный хелпер `setExtraHash`.

```ts
import { setExtraHash } from '@yandex-data-ui/playwright-utils/har';

test('My test', async ({ page }) => {
  const my = new MyPage(page);

  await my.goto();
  // Делается запрос
  await my.clickRequestButton();
  // Проверяем результат на ожидаемый
  await my.assertResult('First run');

  // Ставим заголовок с каким-то новым значением
  await setExtraHash('change');

  // Действие, которое изменит результат
  await my.changeSomething();
  // Повторный запрос с такими же параметрами
  await my.clickRequestButton();
  // Проверяем результат на ожидаемый
  await my.assertResult('Second run');
});
```

## initDumps

Делает необходимые приготовления для сохранения дампов запросов.

```ts
async function initDumps(page: Page, testInfo: TestInfo, options?: InitDumpsOptions): void;
```

```ts
type InitDumpsOptions = {
  /**
   * Пользовательский путь до дампов. По-умолчанию путь вычисляется как
   * testInfo.snapshotPath('').replace(/-snapshots\/[^/]+$/, '-data/' + slug)
   * @param testInfo TestInfo информация о текущем тесте
   * @param slug slug теста
   *
   * @returns string путь до дампа
   */
  dumpsPath?: (testInfo: TestInfo, slug: string) => string;

  /**
   * Путь до корневой директории проекта, относительно которого будет посчитан
   * путь до директории дампов (если не указан, то путь абсолютный)
   */
  rootPath?: string;

  /**
   * Режим записи запросов в файл, вместо чтения из него
   * @defaultValue `false`
   */
  update?: boolean;

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
   * Режим работы для запросов, которые не найдены в архиве
   * @defaultValue `'abort'`
   */
  notFound?: 'abort' | 'fallback';

  /**
   * Шаблон адреса запросов, которые будут обработаны
   */
  url?: string | RegExp;

  /**
   * Упаковать результат в архив
   * @defaultValue `true`
   */
  zip?: boolean;
};
```

## addHarLookupTransform

Позволяет внести модификации на этапе поиска записи в дампе, подходящей под запрос.

С помощью этого хука можно заменить что-то в теле ответа, который был выбран для запроса из дампа. А также, изменить что-то в параметрах, на основании которых будет произведён поиск.

Принимает параметры:

- `transformParams` — Функция для изменения параметров, на основании которых будет произведён поиск
- `transformResult` — Функция для изменения результата поиска (здесь можно изменить параметры найденного ответа, например его тело)

```ts
function addHarLookupTransform(
  transformParams?: HarLookupParamsTransformFunction,
  transformResult?: HarLookupResultTransformFunction,
): void;
```

```ts
type HarLookupParamsTransformFunction = (
  params: LocalUtilsHarLookupParams,
) => LocalUtilsHarLookupParams;

type HarLookupResultTransformFunction = (
  result: LocalUtilsHarLookupResult,
  params: LocalUtilsHarLookupParams,
) => LocalUtilsHarLookupResult | Promise<LocalUtilsHarLookupResult>;
```

## addHarOpenTransform

Позволяет внести изменения в JSON, прочитанный из открытого HAR-файла.

Хук срабатывает после того, как был прочитан HAR-файл и разобран в JS_объект из JSON. То есть у нас есть весь объект HAR со всей информацией и массивом всех запросов. Можно что-то поменять массово по всем запросам.

```ts
function addHarOpenTransform(transform: HarTransformFunction): void;

type HarTransformFunction = (harFile: HARFile) => void;
```

## addHarRecorderTransform

Позволяет внести изменения в JSON, который будет записан в HAR-файл.

Хук срабатывает до того, как объект с данными запроса будет добавлен в объект HAR-файла. На вход попадают данные одного запроса. Можно что-то изменить в ним до того, как они будут записаны.

```ts
function addHarRecorderTransform(transform: EntryTransformFunction): void;

type EntryTransformFunction = (entry: Entry) => void;
```

## clearHeaders

Вспомогательная функция, которая чистит указанные заголовки.

Удобно использовать в `addHarRecorderTransform` для удаления приватных заголовков и кук.

```ts
function clearHeaders(headers: Header[], options: ClearHeadersOptions): Header[];
```

```ts
type ClearHeadersOptions = {
  removeHeaders?: Set<string>;
  removeSetCookieFor?: Set<string>;
};
```

## replaceBaseUrlInEntry

Вспомогательная функция, которая подменяет базовый URL в записи запроса HAR-файла.

Параметры:

- `entry` — Запись из HAR-файла
- `fromUrl` — URL для замены
- `toUrl` — URL, на который нужно заменить

```ts
function replaceBaseUrlInEntry(entry: Entry, fromUrl: string, toUrl: string): void;
```

## setExtraHash

Устанавливает заголовок, который может помочь различать запросы с одинаковыми параметрами.

Простая обёртка над `addExtraHttpHeader`, в которой уже зашито стандартное имя добавляемого заголовка.

Можно передать `null` в качестве значения, чтобы удалить заголовок (через `removeExtraHttpHeader`).

```ts
function setExtraHash(page: Page, value: string | null): Promise<void>;
```
