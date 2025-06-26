import type { CacheSettings } from '../data/cacheSettings';
import { cacheSettings } from '../data/cacheSettings';

/**
 * Sets caching options on the file system
 * @param key Caching object
 * @param options Caching options
 */
export function setCacheSettings<TKey extends keyof CacheSettings>(
    key: TKey,
    options: Partial<CacheSettings[TKey]>,
) {
    Object.assign(cacheSettings[key], options);
}
