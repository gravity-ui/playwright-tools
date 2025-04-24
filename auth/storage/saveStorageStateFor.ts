import { setState } from '../../data/storageStates';

import { getStorageState } from './getStorageState';
import type { AuthActions } from './getStorageState';

/**
 * Выполняет аутентификацию в отдельном браузерном контексте и сохраняет
 * снимок браузерного хранилища по заданному ключу
 *
 * @param key Ключ, по которому нужно сохранить состояние браузерного хранилища
 * @param authActions Действия по аутентификации
 */
export async function saveStorageStateFor(key: string, authActions: AuthActions) {
    const storageState = await getStorageState(authActions);

    setState(key, storageState);
}
