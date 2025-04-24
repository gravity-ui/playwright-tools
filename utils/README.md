# Вспомогательные функции

## extractTestSlug

Извлекает идентификатор теста из его названия, для использования в пути к артефактам теста.

Предполагается, что идентификатор записан в конце названия теста в квадратных скобках:  
`'My test title [my-test]'`

Иначе формируется из названия, исключая все спец символы, например:  
`'My test title 1 @test @tag'` -> `'my-test-title-1-test-tag'`

Используется в [setTestSlug](../actions/setTestSlug.ts).

Параметры:
- `title: string` — Название теста

## fetchWithoutRejectUnauthorized

Нативный `fetch` Node.js с параметром `rejectUnauthorized: false`.

Флаг отключает проверку сертификата, что может быть полезно в тестах для похода на стенды, где сертификат не опознаётся системой.

Параметры:
- `input: RequestInfo` — URL или объект запроса
- `init?: RequestInit` — объект инициализации запроса

## getCookieDomain

Возвращает домен для кук на основе baseURL из конфига.

Оставляет в домене только два уровня, удаляет указание порта, добавляет точку в начале.

`https://some.domain.yandex.ru:8080/` → `.yandex.ru`

Параметры:
- `baseURL: string` — значение baseURL, есть в фикстурах теста.

## isUsersObject

Проверяет, что объект подходит под ожидаемую структуру объекта с пользователями.

```ts
function isUsersObject(data: unknown): data is Record<string, UserData>
```

## NeverError

Объект ошибки для недостижимого значения. Параметром конструктора является значение типа `never`, то есть код не должен дойти до этого места.

Удобен для использования в `default` у `switch…case`, для которого не должно быть варианта.

## waitForResolve

Ожидает, когда проверяющая функция вернёт `true`.

Проверяющая функция запускается с заданным интервалом и проверяется её значение. Если вернула `true`, то завершает успехом, иначе — ждём дальше. При таймауте или ошибке в проверяющей функции, завершает неудачей.

Параметры:
- `solver: () => boolean | PromiseLike<boolean>` — Проверяющая функция
- `options?: WaitForResolveOptions` — Параметры

```ts
type WaitForResolveOptions = {
    /**
     * Интервал между проверками (мс)
     * @defaultValue `100`
     */
    interval?: number;
    /**
     * Таймаут, после которого проверки прерываются (мс)
     * `0` — без ограничения
     * @defaultValue `5000`
     */
    timeout?: number;
};
```

## waitHttpService

Ожидает ответа с нужным статусом на заданном URL.

```ts
type WaitHttpServiceOptions = {
    /** Проверяемый URL */
    url: string;
    /**
     * Метод запроса
     * @default 'HEAD'
     */
    method?: string;
    /**
     * Ожидаемый статус ответа
     * @default 200
     */
    expectedStatus?: number;
    /**
     * Интервал между запросами
     * @default 1000
     */
    interval?: number;
    /**
     * Время ожидания
     * @default Infinity
     */
    timeout?: number;
}
```

Подходит для того, чтобы организовать ping готовности сервиса на baseURL. Это может выглядеть примерно так:

tests/setup/ping-base-url.setup.ts
```ts
import { URL } from 'node:url';
import { test as setup } from '@playwright/test';
import { waitHttpService } from '@yandex-data-ui/playwright-utils/utils';

setup('Ping baseURL', async ({ baseURL }) => {
    const timeout = 60_000 * 5;

    setup.setTimeout(timeout + 1000);

    const url = new URL('/ping', baseURL);

    await setup.step(
        `Waiting for response on ${url.href}`,
        () =>
            waitHttpService({
                url: url.href,
                interval: 5000,
                timeout,
            }),
        { box: true },
    );
});
```

tests/playwright.config.ts
```ts
export const config = defineConfig({
    projects: [
        {
            name: 'Ping canary',
            testDir: 'setup',
            testMatch: 'ping-base-url.setup.ts',
            retries: 0,
            use: {
                baseURL: 'canary.example.com',
            },
        },
        {
            name: 'Canary',
            testMatch: '*.canary.test.ts',
            use: {
                ...devices['Desktop Chrome'],
                baseURL: 'canary.example.com',
            },
            dependencies: ['Ping canary'],
        },
    ],
});
export default config;
```

## Работа с кэшем

### deleteCache

Удаляет файл кэша.

- `path: string` — Путь до директории с кэшем.
- `name: string` — Имя кэша (без расширения).

### readCache

Возвращает содержимое из файла кэша.

- `path: string` — Путь до директории с кэшем.
- `name: string` — Имя кэша (без расширения).
- `ttl: string` — Время жизни кэша (мс).

### writeCache

Записывает данные в кэш-файл.

- `path: string` — Путь до директории с кэшем.
- `name: string` — Имя кэша (без расширения).
- `data: string` — Данные для записи в кэш.
