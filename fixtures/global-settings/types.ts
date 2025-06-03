import type { getGlobalSettings, setGlobalSettings } from '../../actions';
import type { PartialGlobalSettings } from '../../data/globalSettings';

export type GlobalSettingsFixturesBuilderParams = {
    /**
     * Global settings that need to be overridden
     */
    globalSettings: PartialGlobalSettings;
};

export type GlobalSettingsWorkerArgs = {
    initGlobalSettings: void;
};

export type GlobalSettingsTestArgs = {
    setGlobalSettings: typeof setGlobalSettings;
    getGlobalSettings: typeof getGlobalSettings;
};
