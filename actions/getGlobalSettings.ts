import type { GlobalSettings } from '../data/globalSettings';
import { globalSettings } from '../data/globalSettings';

/**
 * Returns global settings for commands for a given section (command)
 */
export function getGlobalSettings<TSection extends keyof GlobalSettings>(
    section: TSection,
): GlobalSettings[TSection] {
    return globalSettings[section];
}
