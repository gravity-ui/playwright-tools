import { getState } from '../../data/storageStates';

/**
 * Возвращает снимок браузерного хранилища для заданного ключа
 *
 * @param key Ключ, под которых сохранён снимок браузерного хранилища
 */
export function getStorageStateFor(key: string) {
    return getState(key);
}
