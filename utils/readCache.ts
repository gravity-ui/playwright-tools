import { readFile, stat } from 'fs/promises';
import { resolve } from 'path';

const checkedPaths = new Set<string>();

/**
 * Returns the contents of the cache file
 *
 * @param path Path to the directory with cache
 * @param name cache name (without extension)
 * @param ttl Cache Lifetime (ms)
 */
export async function readCache<TData = unknown>(path: string, name: string, ttl: number) {
    const fullPath = resolve(path, name + '.json');

    if (checkedPaths.has(fullPath)) {
        return undefined;
    }

    checkedPaths.add(fullPath);

    try {
        const { mtimeMs } = await stat(fullPath);

        if (mtimeMs + ttl < Date.now()) {
            return undefined;
        }

        const json = await readFile(fullPath, 'utf8');
        const data = JSON.parse(json);

        return data as TData;
    } catch {
        return undefined;
    }
}
