import type { UserData } from '../types/UserData';

/**
 * User storage for built-in authentication methods
 */
export const users: Record<string, UserData> = Object.create(null);
