import { mkdir, writeFile } from 'fs/promises';
import { resolve } from 'path';

/**
 * Writes data to the cache file
 *
 * @param path Path to the directory with cache
 * @param name Cache name (without extension)
 * @param data Data to write to cache
 */
export async function writeCache(path: string, name: string, data: unknown) {
    const fullPath = resolve(path, name + '.json');
    const json = JSON.stringify(data);

    await mkdir(path, { recursive: true }).catch(() => {});
    await writeFile(fullPath, json, 'utf8');
}
