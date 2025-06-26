/**
 * Location of data cache on file system
 */
export const cacheSettings = {
    /**
     * Caching authentication data
     */
    auth: {
        /**
         * Path to the directory where the cache files should be stored
         */
        path: undefined as string | undefined,
        /**
         * Cache TTL
         */
        ttl: 30 * 60 * 1000,
    },
} satisfies Record<string, object>;

export type CacheSettings = typeof cacheSettings;
