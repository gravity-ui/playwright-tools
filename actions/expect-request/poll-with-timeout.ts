interface PollWithTimeoutParams<T> {
    /** Function to poll (should return a promise). */
    callbackFn: () => Promise<T>;
    /** Function that checks the result to determine if polling should stop. */
    condition: (result: T) => boolean;
    /** Time between polls in milliseconds; default value `1000ms`. */
    interval?: number;
    /** Maximum time to wait in milliseconds before rejecting; default value `15000ms`. */
    timeout?: number;
    /** Called when timeout occurs. */
    onTimeout?: (params: {
        /** Lets you resolve with a custom value */
        resolve: (value: T | PromiseLike<T>) => void;
        /** Lets you reject with custom error */
        reject: (reason?: unknown) => void;
    }) => void;
}

/**
 * Polls a function at a specified interval until a condition is met or timeout is reached.
 */
export async function pollWithTimeout<T>(params: PollWithTimeoutParams<T>): Promise<T> {
    const { callbackFn, condition, interval = 1000, timeout = 5000, onTimeout } = params;

    const startTime = Date.now();

    return new Promise<T>((resolve, reject) => {
        const checkTimeout = () => {
            if (timeout && Date.now() - startTime >= timeout) {
                if (onTimeout) {
                    onTimeout({ resolve, reject });
                } else {
                    reject(new Error(`Request polling timed out after ${timeout}ms`));
                }
                return;
            }
        };

        const executePoll = async () => {
            try {
                checkTimeout();

                const result = await callbackFn();

                if (condition(result)) {
                    resolve(result);
                } else {
                    setTimeout(executePoll, interval);
                }
            } catch (error) {
                reject(error);
            }
        };

        void executePoll();
    });
}
