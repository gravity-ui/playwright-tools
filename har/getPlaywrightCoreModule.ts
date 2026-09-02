import { dirname, resolve } from 'node:path';

type PlaywrightCoreModule = Record<string, unknown>;

function isModuleNotFound(error: unknown): boolean {
    return (error as NodeJS.ErrnoException).code === 'MODULE_NOT_FOUND';
}

function tryResolve(modulePath: string): string | undefined {
    try {
        return require.resolve(modulePath);
    } catch (error) {
        if (isModuleNotFound(error)) {
            return undefined;
        }

        throw error;
    }
}

function getPlaywrightCoreRoots(): string[] {
    const roots = new Set<string>();
    const playwrightCoreEntry = tryResolve('playwright-core');

    if (playwrightCoreEntry) {
        roots.add(dirname(playwrightCoreEntry));
    }

    const playwrightTestEntry = tryResolve('@playwright/test');

    if (playwrightTestEntry) {
        roots.add(resolve(dirname(playwrightTestEntry), 'node_modules/playwright-core'));
    }

    return [...roots];
}

function requireEach(paths: (string | undefined)[]): PlaywrightCoreModule[] {
    const resolvedModules = new Set<string>();
    const modules: PlaywrightCoreModule[] = [];

    for (const modulePath of paths) {
        if (!modulePath || resolvedModules.has(modulePath)) {
            continue;
        }

        resolvedModules.add(modulePath);
        modules.push(require(modulePath) as PlaywrightCoreModule);
    }

    return modules;
}

/**
 * Loads every installed copy of a playwright-core internal module.
 *
 * The second location preserves the historical support for installations where
 * @playwright/test owns a nested playwright-core dependency.
 */
export function getPlaywrightCoreModules(path: string): PlaywrightCoreModule[] {
    return requireEach(getPlaywrightCoreRoots().map((root) => tryResolve(resolve(root, path))));
}

/**
 * Loads the public entry point of every installed copy of playwright-core: the
 * `playwright` object with `chromium` / `firefox` / `webkit` on it. This is the
 * same object the test runner launches browsers with.
 */
export function getPlaywrightCoreEntries(): PlaywrightCoreModule[] {
    return requireEach(getPlaywrightCoreRoots().map((root) => tryResolve(root)));
}
