import type { PartialGlobalSettings } from '../data/globalSettings';
import { globalSettings } from '../data/globalSettings';

/**
 * Устанавливает глобальные настройки для команд
 *
 * Объект с настройками раздела объединяется поверхностно,
 * без глубокого объединения.
 *
 * То есть объект с настройками
 * `{ matchScreenshot: { options: { threshold: 0.2 } } }`
 * перезапишет целиком значение `options` в разделе `matchScreenshot`.
 */
export function setGlobalSettings(settings: PartialGlobalSettings) {
    for (const section of Object.keys(settings) as Array<keyof PartialGlobalSettings>) {
        Object.assign(globalSettings[section], settings[section]);
    }
}
