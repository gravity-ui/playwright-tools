import type { PartialGlobalSettings } from '../data/globalSettings';
import { globalSettings } from '../data/globalSettings';

/**
 * Sets global settings for commands
 *
 * The section settings object is shallowly merged,
 * without deep merging.
 *
 * That is, the settings object
 * `{ matchScreenshot: { options: { threshold: 0.2 } } }`
 * will overwrite the entire value of `options` in the `matchScreenshot` section.
 */

export function setGlobalSettings(settings: PartialGlobalSettings) {
    for (const section of Object.keys(settings) as Array<keyof PartialGlobalSettings>) {
        Object.assign(globalSettings[section], settings[section]);
    }
}
