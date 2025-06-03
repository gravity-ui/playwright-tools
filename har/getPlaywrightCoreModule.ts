import { dirname, resolve } from 'path';

/**
 * Finds the location of the internal playwright-core module for patching
 */
export function getPlaywrightCoreModule(path: string) {
    let globalModule;

    try {
        const globalModulePath = dirname(require.resolve('playwright-core'));

        globalModule = require(resolve(globalModulePath, path));
    } catch {
        // Do nothing
    }

    let internalModule;

    try {
        const playwrightTestsPath = dirname(require.resolve('@playwright/test'));
        const harRecorderPath = resolve(
            playwrightTestsPath,
            'node_modules/playwright-core/' + path,
        );

        internalModule = require(harRecorderPath);
    } catch {
        // Do nothing
    }

    if (!globalModule && !internalModule) {
        throw new Error(`Can't find "playwright-core/${path}" module.`);
    }

    if (globalModule === internalModule) {
        return [globalModule];
    }

    return [globalModule, internalModule].filter((item) => item !== undefined);
}
