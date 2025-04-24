import { unlink } from 'fs/promises';
import { resolve } from 'path';

/**
 * Удаляет файл кэша
 *
 * @param path Путь до директории с кэшем
 * @param name Имя кэша (без расширения)
 */
export function deleteCache(path: string, name: string) {
    const fullPath = resolve(path, name + '.json');

    return unlink(fullPath).catch(() => {});
}
