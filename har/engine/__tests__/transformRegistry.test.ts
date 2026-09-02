import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';

import type {
    Entry,
    HARFile,
    LocalUtilsHarLookupParams,
    LocalUtilsHarLookupResult,
} from '../../types';
import { resetDegradations } from '../diagnostics';
import type * as RegistryModule from '../transformRegistry';
import {
    getHarTransforms,
    markReplayOpened,
    registerLegacyTransforms,
    resetHarTransforms,
    setFixtureHarTransforms,
} from '../transformRegistry';

const noopOpen = (_harFile: HARFile) => undefined;
const noopRecorder = (_entry: Entry) => undefined;

describe('transformRegistry', () => {
    let warn: ReturnType<typeof jest.spyOn>;

    beforeEach(() => {
        warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    });

    afterEach(() => {
        warn.mockRestore();
        resetDegradations();
        resetHarTransforms({ global: true });
    });

    it('has no transforms by default', () => {
        expect(getHarTransforms()).toStrictEqual({
            open: undefined,
            lookupParams: undefined,
            lookupResult: undefined,
            recorder: undefined,
            flush: undefined,
        });
    });

    it('keeps the first registration of a legacy call and ignores later ones', () => {
        const first = (harFile: HARFile) => noopOpen(harFile);
        const second = (harFile: HARFile) => noopOpen(harFile);

        registerLegacyTransforms('open', { open: first });
        registerLegacyTransforms('open', { open: second });

        expect(getHarTransforms().open).toBe(first);
    });

    it('latches each legacy call independently', () => {
        registerLegacyTransforms('open', { open: noopOpen });
        registerLegacyTransforms('recorder', { recorder: noopRecorder });

        expect(getHarTransforms().open).toBe(noopOpen);
        expect(getHarTransforms().recorder).toBe(noopRecorder);
    });

    it('registers both slots of a single legacy call at once', () => {
        const params = (value: LocalUtilsHarLookupParams) => value;
        const result = (value: LocalUtilsHarLookupResult) => value;

        registerLegacyTransforms('lookup', { lookupParams: params, lookupResult: result });

        expect(getHarTransforms().lookupParams).toBe(params);
        expect(getHarTransforms().lookupResult).toBe(result);
    });

    it('replaces fixture transforms on every registration', () => {
        const first = (entry: Entry) => noopRecorder(entry);
        const second = (entry: Entry) => noopRecorder(entry);

        setFixtureHarTransforms({ recorder: first });
        expect(getHarTransforms().recorder).toBe(first);

        setFixtureHarTransforms({ recorder: second });
        expect(getHarTransforms().recorder).toBe(second);

        setFixtureHarTransforms({});
        expect(getHarTransforms().recorder).toBeUndefined();
    });

    it('prefers a legacy registration over a fixture one', () => {
        const legacy = (entry: Entry) => noopRecorder(entry);
        const fixture = (entry: Entry) => noopRecorder(entry);

        setFixtureHarTransforms({ recorder: fixture });
        registerLegacyTransforms('recorder', { recorder: legacy });

        expect(getHarTransforms().recorder).toBe(legacy);
    });

    it('drops only fixture transforms unless the reset is global', () => {
        registerLegacyTransforms('open', { open: noopOpen });
        setFixtureHarTransforms({ recorder: noopRecorder });

        resetHarTransforms();

        expect(getHarTransforms().open).toBe(noopOpen);
        expect(getHarTransforms().recorder).toBeUndefined();

        resetHarTransforms({ global: true });

        expect(getHarTransforms().open).toBeUndefined();
    });

    it('releases the legacy latch on a global reset', () => {
        const first = (harFile: HARFile) => noopOpen(harFile);
        const second = (harFile: HARFile) => noopOpen(harFile);

        registerLegacyTransforms('open', { open: first });
        resetHarTransforms({ global: true });
        registerLegacyTransforms('open', { open: second });

        expect(getHarTransforms().open).toBe(second);
    });

    it('warns when a later registration carries a different function', () => {
        const first = (harFile: HARFile) => noopOpen(harFile);
        const second = (harFile: HARFile) => noopOpen(harFile);

        registerLegacyTransforms('open', { open: first });
        registerLegacyTransforms('open', { open: second });
        registerLegacyTransforms('open', { open: second });

        expect(getHarTransforms().open).toBe(first);
        expect(warn).toHaveBeenCalledTimes(1);
        expect(warn.mock.calls[0]![0]).toContain('transform-registered-twice');
        expect(warn.mock.calls[0]![0]).toContain('open:');
    });

    it('warns per hook', () => {
        registerLegacyTransforms('open', { open: noopOpen });
        registerLegacyTransforms('open', { open: (harFile: HARFile) => noopOpen(harFile) });
        registerLegacyTransforms('recorder', { recorder: noopRecorder });
        registerLegacyTransforms('recorder', { recorder: (entry: Entry) => noopRecorder(entry) });

        expect(warn.mock.calls.map(([message]: unknown[]) => String(message))).toStrictEqual([
            expect.stringContaining('transform-registered-twice:open'),
            expect.stringContaining('transform-registered-twice:recorder'),
        ]);
    });

    it('stays silent when the same function is registered again', () => {
        registerLegacyTransforms('recorder', { recorder: noopRecorder });
        registerLegacyTransforms('recorder', { recorder: noopRecorder });

        expect(warn).not.toHaveBeenCalled();
    });

    it('throws when an open transform is registered after a replay has started', () => {
        markReplayOpened();

        expect(() => registerLegacyTransforms('open', { open: noopOpen })).toThrow(
            /addHarOpenTransform\(\) was called after routeFromHAR\(\)/,
        );
        expect(getHarTransforms().open).toBeUndefined();

        // The other hooks are read lazily and still apply.
        registerLegacyTransforms('recorder', { recorder: noopRecorder });
        setFixtureHarTransforms({ open: noopOpen });

        expect(getHarTransforms().recorder).toBe(noopRecorder);
        expect(getHarTransforms().open).toBe(noopOpen);
    });

    it('forgets the opened replay on a global reset', () => {
        markReplayOpened();
        resetHarTransforms({ global: true });

        expect(() => registerLegacyTransforms('open', { open: noopOpen })).not.toThrow();
    });

    it('shares the registry with another copy of the module', () => {
        registerLegacyTransforms('open', { open: noopOpen });

        let other: typeof RegistryModule | undefined;

        jest.isolateModules(() => {
            other = require('../transformRegistry') as typeof RegistryModule;
        });

        expect(other!.getHarTransforms().open).toBe(noopOpen);

        other!.registerLegacyTransforms('recorder', { recorder: noopRecorder });

        expect(getHarTransforms().recorder).toBe(noopRecorder);
    });
});
