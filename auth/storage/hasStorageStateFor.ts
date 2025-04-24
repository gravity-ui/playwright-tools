import { hasState } from '../../data/storageStates';

/**
 * Проверяет, есть ли снимок браузерного хранилища для заданного ключа
 *
 * @param key Ключ, под которых сохранён снимок браузерного хранилища
 */
export function hasStorageStateFor(key: string) {
    return hasState(key);
}
