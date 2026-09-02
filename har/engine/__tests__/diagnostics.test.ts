import { afterEach, describe, expect, it, jest } from '@jest/globals';

import { degrade, resetDegradations } from '../diagnostics';

describe('degrade', () => {
    afterEach(() => {
        resetDegradations();
        delete process.env.PLAYWRIGHT_TOOLS_HAR_STRICT;
    });

    it('reports each code once per process', () => {
        const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);

        degrade('some-code', 'first');
        degrade('some-code', 'second');

        expect(warn).toHaveBeenCalledTimes(1);
        expect(warn.mock.calls[0]![0]).toContain('HAR engine degraded (some-code)');

        warn.mockRestore();
    });

    it('reports a different code again', () => {
        const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);

        degrade('first-code', 'first');
        degrade('second-code', 'second');

        expect(warn).toHaveBeenCalledTimes(2);

        warn.mockRestore();
    });

    it('throws every time in strict mode', () => {
        const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);

        process.env.PLAYWRIGHT_TOOLS_HAR_STRICT = '1';

        expect(() => degrade('some-code', 'first')).toThrow(/degraded \(some-code\): first/);
        expect(() => degrade('some-code', 'second')).toThrow(/second/);
        expect(warn).not.toHaveBeenCalled();

        warn.mockRestore();
    });

    it('treats an empty, "0" or "false" flag as off', () => {
        const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);

        for (const value of ['', '0', 'false']) {
            process.env.PLAYWRIGHT_TOOLS_HAR_STRICT = value;
            resetDegradations();

            expect(() => degrade('some-code', 'message')).not.toThrow();
        }

        expect(warn).toHaveBeenCalledTimes(3);

        warn.mockRestore();
    });
});
