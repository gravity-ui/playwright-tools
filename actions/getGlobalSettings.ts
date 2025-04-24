import type { GlobalSettings } from '../data/globalSettings';
import { globalSettings } from '../data/globalSettings';

/**
 * Возвращает глобальные настройки для команд по заданному разделу (команде)
 */
export function getGlobalSettings<TSection extends keyof GlobalSettings>(
    section: TSection,
): GlobalSettings[TSection] {
    return globalSettings[section];
}
