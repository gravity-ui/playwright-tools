import { afterEach, describe, expect, it } from '@jest/globals';

import type {
    Entry,
    HARFile,
    LocalUtilsHarLookupParams,
    LocalUtilsHarLookupResult,
} from '../../types';
import {
    getHarTransforms,
    registerLegacyTransforms,
    resetHarTransforms,
    setFixtureHarTransforms,
} from '../transformRegistry';

const noopOpen = (_harFile: HARFile) => undefined;
const noopRecorder = (_entry: Entry) => undefined;

describe('transformRegistry', () => {
    afterEach(() => {
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
});
