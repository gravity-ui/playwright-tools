import { mkdir, writeFile } from 'fs/promises';
import { resolve } from 'path';

/**
 * Записывает данные в кэш-файл
 *
 * @param path Путь до директории с кэшем
 * @param name Имя кэша (без расширения)
 * @param data Данные для записи в кэш
 */
export async function writeCache(path: string, name: string, data: unknown) {
    const fullPath = resolve(path, name + '.json');
    const json = JSON.stringify(data);

    await mkdir(path, { recursive: true }).catch(() => {});
    await writeFile(fullPath, json, 'utf8');
}
