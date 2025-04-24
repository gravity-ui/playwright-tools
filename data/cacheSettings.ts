/**
 * Расположение кэша данных на файловой системе
 */
export const cacheSettings = {
    /**
     * Кэширование данных аутентификации
     */
    auth: {
        /**
         * Путь до директории, где должны храниться файлы кэша
         */
        path: undefined as string | undefined,
        /**
         * Время жизни кэша
         */
        ttl: 30 * 60 * 1000,
    },
} satisfies Record<string, object>;

export type CacheSettings = typeof cacheSettings;
