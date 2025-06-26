import { unlink } from 'fs/promises';
import { resolve } from 'path';

/**
 * Remove file from cache
 *
 * @param path cache path
 * @param name cache name (without extension)
 */
export function deleteCache(path: string, name: string) {
    const fullPath = resolve(path, name + '.json');

    return unlink(fullPath).catch(() => {});
}
