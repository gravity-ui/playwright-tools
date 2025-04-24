import type { UserData } from '../types/UserData';

/**
 * Хранилище пользователей для встроенных методов аутентификации
 */
export const users: Record<string, UserData> = Object.create(null);
