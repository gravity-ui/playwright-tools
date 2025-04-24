import type { getGlobalSettings, setGlobalSettings } from '../../actions';
import type { PartialGlobalSettings } from '../../data/globalSettings';

export type GlobalSettingsFixturesBuilderParams = {
    /**
     * Глобальные настройки, которые необходимо переопределить
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
