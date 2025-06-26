import { setTimeout } from 'node:timers/promises';

import { fetchWithoutRejectUnauthorized } from './fetchWithoutRejectUnauthorized';

export type WaitHttpServiceOptions = {
    /** URL to check */
    url: string;
    /**
     * Request Method
     * @default 'HEAD'
     */
    method?: string;
    /**
     * Expected response status
     * @default 200
     */
    expectedStatus?: number;
    /**
     * Interval between requests
     * @default 1000
     */
    interval?: number;
    /**
     * Waiting time
     * @default Infinity
     */
    timeout?: number;
};

/**
 * Waits for a response with the required status at the given URL
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
