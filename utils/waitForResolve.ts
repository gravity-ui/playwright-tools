import { globalSettings } from '../data/globalSettings';

export type WaitForResolveOptions = {
    /**
     * Interval between checks (ms)
     * @defaultValue `100`
     */
    interval?: number;
    /**
     * Timeout after which checks are aborted (ms)
     * `0` — without limitation
     * @defaultValue `5000`
     */
    timeout?: number;
};

/**
 * Waits for the check function to return `true`
 *
 * The checking function is launched at a given interval and its value is checked.
 * If it returned `true`, then it succeeds, otherwise we wait further.
 * If there is a timeout or an error in the checking function, it fails.
 *
 * @param solver resolving function
 * @param options Options
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
