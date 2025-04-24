import type { CacheSettings } from '../data/cacheSettings';
import { cacheSettings } from '../data/cacheSettings';

/**
 * Устанавливает параметры кэширования на файловой системе
 * @param key Сущность кэширования
 * @param options Параметры кэширования
 */
export function setCacheSettings<TKey extends keyof CacheSettings>(
    key: TKey,
    options: Partial<CacheSettings[TKey]>,
) {
    Object.assign(cacheSettings[key], options);
}
