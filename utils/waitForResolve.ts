import { globalSettings } from '../data/globalSettings';

export type WaitForResolveOptions = {
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

/**
 * Ожидает, когда проверяющая функция вернёт `true`
 *
 * Проверяющая функция запускается с заданным интервалом и проверяется
 * её значение. Если вернула `true`, то завершает успехом, иначе — ждём дальше.
 * При таймауте или ошибке в проверяющей функции, завершает неудачей.
 *
 * @param solver Проверяющая функция
 * @param options Параметры
 */
export function waitForResolve(
    solver: () => boolean | PromiseLike<boolean>,
    {
        interval = globalSettings.waitForResolve.interval,
        timeout = globalSettings.waitForResolve.timeout,
    }: WaitForResolveOptions = {},
) {
    const until = timeout === 0 ? 0 : Date.now() + timeout;

    let resolveResult: () => void;
    let rejectResult: (reason?: unknown) => void;

    const resultPromise = new Promise<void>((resolve, reject) => {
        resolveResult = resolve;
        rejectResult = reject;
    });

    const timer = setInterval(async () => {
        try {
            if (await solver()) {
                clearInterval(timer);
                resolveResult();

                return;
            }

            if (until && Date.now() > until) {
                clearInterval(timer);
                rejectResult(new Error('waitForResolve timeout'));
            }
        } catch (error) {
            rejectResult(error);
        }
    }, interval);

    return resultPromise;
}
