import { setTimeout } from 'node:timers/promises';

import { fetchWithoutRejectUnauthorized } from './fetchWithoutRejectUnauthorized';

export type WaitHttpServiceOptions = {
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
};

/**
 * Ожидает ответа с нужным статусом на заданном URL
 */
export async function waitHttpService({
    url,
    method = 'HEAD',
    expectedStatus = 200,
    interval = 1000,
    timeout = Infinity,
}: WaitHttpServiceOptions) {
    const until = Date.now() + timeout;
    let success = false;

    do {
        const response = await fetchWithoutRejectUnauthorized(url, {
            method,
        }).catch(() => null);

        if (response?.status === expectedStatus) {
            success = true;

            return;
        }

        await setTimeout(interval);

        if (Date.now() > until) {
            throw new Error('Timed out waiting for ' + url);
        }
    } while (!success);
}
