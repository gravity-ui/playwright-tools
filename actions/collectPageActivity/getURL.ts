class InvalidURLError extends Error {
    readonly url: string;
    readonly base: string | undefined;

    constructor(message: string, url: string, base: string | undefined) {
        super(message);

        this.name = 'InvalidURLError';
        this.url = url;
        this.base = base;

        //https://github.com/Microsoft/TypeScript-wiki/blob/master/Breaking-Changes.md#extending-built-ins-like-error-array-and-map-may-no-longer-work
        Object.setPrototypeOf(this, InvalidURLError.prototype);

        Error.captureStackTrace?.(this, this.constructor);
    }

    toJSON() {
        const { url, base } = this;

        return {
            url,
            base,
        };
    }
}

export function getURL(url: string, base?: string) {
    try {
        return new URL(url, base);
    } catch {
        let message: string;

        if (base === undefined) {
            message = 'isSameResponse: failed to create URL for url %s';
        } else {
            message = 'isSameResponse: failed to create URL for url %s and base %s';
        }

        console.error(message, url, base);

        throw new InvalidURLError('isSameResponse: failed to create url', url, base);
    }
}
