const unidiciGlobalDispatcherSymbol = Symbol.for('undici.globalDispatcher.1');

type Dispatcher = {
    constructor: new (options: {
        connect: {
            rejectUnauthorized: boolean;
        };
    }) => Dispatcher;
};

type GlobalWithUndiciDispatcher = typeof global & {
    [unidiciGlobalDispatcherSymbol]: Dispatcher;
};

let dispatcherWithoutRejectUnauthorized: Dispatcher | undefined;

/**
 * Native fetch with certificate verification disabled
 */
export const fetchWithoutRejectUnauthorized: typeof fetch = async (input, init) => {
    if (!dispatcherWithoutRejectUnauthorized) {
        // Initialize fetch globals
        await fetch('data:text/plain,');

        // Getting the dispatcher from global is considered a public API
        // https://github.com/nodejs/undici/discussions/2167#discussioncomment-6265039
        const undiciGlobalDispatcher = (global as GlobalWithUndiciDispatcher)[
            unidiciGlobalDispatcherSymbol
        ];

        dispatcherWithoutRejectUnauthorized = new undiciGlobalDispatcher.constructor({
            connect: {
                rejectUnauthorized: false,
            },
        });
    }

    const fetchOptions = {
        dispatcher: dispatcherWithoutRejectUnauthorized,
        ...init,
    };

    return fetch(input, fetchOptions);
};
