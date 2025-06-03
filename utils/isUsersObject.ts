import type { UserData } from '../types/UserData';

/**
 * Checks that the object matches the expected structure of the object with users
 */
export function isUsersObject(data: unknown): data is Record<string, UserData> {
    return Boolean(
        data && typeof data === 'object' && typeof Object.values(data)[0]?.type === 'string',
    );
}
