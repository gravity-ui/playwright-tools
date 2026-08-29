import { afterEach, describe, expect, it, jest } from '@jest/globals';

import { degrade, resetDegradations } from '../diagnostics';

describe('degrade', () => {
    afterEach(() => {
        resetDegradations();
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
});
