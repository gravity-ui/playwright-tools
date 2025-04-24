import type { TestInfo } from '@playwright/test';

import type {
    Entry,
    HarLookupParamsTransformFunction,
    HarLookupResultTransformFunction,
} from '../../har';

export type MockNetworkFixtureBuilderParams = {
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
