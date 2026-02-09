import { getGlobalSettings, setGlobalSettings } from '../../actions';
import { expect, test } from '../test';

test.describe('Global Settings Fixture Integration Tests', () => {
    let originalPause: number;

    test.beforeAll(() => {
        // Store original settings
        const settings = getGlobalSettings('matchScreenshot');
        originalPause = settings.pause;
    });

    test.afterAll(() => {
        // Restore original settings
        setGlobalSettings({
            matchScreenshot: {
                pause: originalPause,
            },
        });
    });

    test('should modify and read global settings', async ({
        getGlobalSettings,
        setGlobalSettings,
    }) => {
        // Read initial settings
        const initialSettings = getGlobalSettings('matchScreenshot');
        expect(initialSettings.pause).toBeDefined();

        // Modify settings
        const newPauseValue = 2500;
        setGlobalSettings({
            matchScreenshot: {
                pause: newPauseValue,
            },
        });

        // Re-read settings to verify change
        const updatedSettings = getGlobalSettings('matchScreenshot');
        expect(updatedSettings.pause).toBe(newPauseValue);
    });
});
