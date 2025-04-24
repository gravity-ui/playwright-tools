import { deleteState } from '../../data/storageStates';

/**
 * Удаляет снимок браузерного хранилища для заданного ключа
 *
 * @param key Ключ, под которых сохранён снимок браузерного хранилища
 */
export function deleteStorageStateFor(key: string) {
    return deleteState(key);
}
