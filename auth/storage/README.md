# Функции аутентификации: сохранение и восстановление снимка браузерного хранилища

По-умолчанию снимки хранятся только в памяти. Можно задать сохранение кэша на диск с помощью `setCacheSettings` по ключу `auth`.

## applyStorageState

Восстанавливает сохранённое браузерное хранилище.

Параметры:
- `context: BrowserContext` — Контекст браузера
- `storageState: StorageState` — Снимок браузерного хранилища
- `append: boolean = false` — Добавить к существующему хранилищу (иначе — сначала чистим)

## applyStorageStateFor

Восстанавливает сохранённое браузерное хранилище по заданному ключу

Параметры:
- `key: string` — Ключ, под которых сохранён снимок браузерного хранилища
- `context: BrowserContext` — Контекст браузера
- `append: boolean = false` — Добавить к существующему хранилищу (иначе — сначала чистим)

## deleteStorageStateFor

Удаляет снимок браузерного хранилища для заданного ключа.

Параметры:
- `key: string` — Ключ, под которых сохранён снимок браузерного хранилища

## getStorageState

Выполняет аутентификацию в отдельном браузерном контексте и возвращает снимок браузерного хранилища.

Параметры:
- `authActions: AuthActions` — Действия по аутентификации

```ts
type AuthActions = (page: Page) => Promise<void>;
```

## getStorageStateFor

Возвращает снимок браузерного хранилища для заданного ключа.

Параметры:
- `key: string` — Ключ, под которых сохранён снимок браузерного хранилища

## hasStorageStateFor

Проверяет, есть ли снимок браузерного хранилища для заданного ключа

Параметры:
- `key: string` — Ключ, под которых сохранён снимок браузерного хранилища

## restoreCookies

Восстанавливает в браузере сохранённые куки.

Параметры:
- `context: BrowserContext` — Контекст браузера
- `cookies: StorageState['cookies']` — Перечень кук для восстановления
- `append: boolean = false` — Добавить к существующим кукам (иначе — сначала чистим)

```ts
type StorageState = Awaited<ReturnType<BrowserContext['storageState']>>;
```

## restoreLocalStorage

Восстанавливает в браузере сохранённые записи localStorage.

Параметры:
- `context: BrowserContext` — Контекст браузера
- `origins: StorageState['origins']` — Перечень записей в localStorage для восстановления
- `append: boolean = false` — Добавить к существующим записям (иначе — сначала чистим)

```ts
type StorageState = Awaited<ReturnType<BrowserContext['storageState']>>;
```

## saveStorageStateFor

Выполняет аутентификацию в отдельном браузерном контексте и сохраняет снимок браузерного хранилища по заданному ключу.

Параметры:
- `key: string` — Ключ, по которому нужно сохранить состояние браузерного хранилища
- `authActions: AuthActions` — Действия по аутентификации

```ts
type AuthActions = (page: Page) => Promise<void>;
```
