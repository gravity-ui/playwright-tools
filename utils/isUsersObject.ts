import type { UserData } from '../types/UserData';

/**
 * Проверяет, что объект подходит под ожидаемую структуру объекта с пользователями
 */
export function isUsersObject(data: unknown): data is Record<string, UserData> {
    return Boolean(
        data && typeof data === 'object' && typeof Object.values(data)[0]?.type === 'string',
    );
}
