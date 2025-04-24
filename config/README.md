# Базовый конфиг

Можно использовать как пример настройки, или импортировать и расширять у себя.

Пример использования можно увидеть в [example/playwright.config.ts](../example/playwright.config.ts).

## base

Все основные настройки. Описание настроек можно посмотреть в [документации по рекомендуемой настройке](https://ui.yandex-team.ru/tests/playwright).

В конфиге `use.baseURL` указан как `https://localhost`. Нужно поменять на свой адрес сервиса. Например, это можно сделать, сформировав новый объект, на основе базового, с переопределениями:

```ts
{
    ...baseConfig,
    use: {
        ...baseConfig.use,
        baseURL: 'https://console-preprod.cloud.yandex.ru',
    },
}
```

В качестве браузера указан только Desktop Chrome.

## browsers

Коллекция стандартных браузеров. Содержит и десктопные и мобильные браузеры.

В конфиге браузеров указан нестандартных параметр `projectName`, чтобы было легко фильтровать в тестах по браузеры (например, через `test.skip`). Для того, чтобы можно было использовать этот параметр, нужно указать его в своём расширении для `test`, как это сделано [в примере](../example/playwright.ts).

Предоставляет объединённый перечень браузеров из browsersDesktop и browsersMobile.

Полный список браузеров, которые может эмулировать Playwright, можно посмотреть в [deviceDescriptorsSource.json](https://github.com/microsoft/playwright/blob/main/packages/playwright-core/src/server/deviceDescriptorsSource.json).

## browsersDesktop

Только десктопные браузеры.

Браузеры в наборе:
- `Chrome` (Desktop Chrome)
- `Safari` (Desktop Safari)
- `Firefox` (Desktop Firefox)

## browsersMobile

Только мобильные браузеры.

Браузеры в наборе:
- `Android` (Pixel 5)
- `iPhone` (iPhone 12)
