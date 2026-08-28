import { describe, expect, it } from '@jest/globals';

import { harJsonStringify } from '../harJsonStringify';

describe('harJsonStringify', () => {
    it('indents objects and arrays', () => {
        expect(harJsonStringify({ log: { version: '1.2' } })).toBe(
            '{\n  "log": {\n    "version": "1.2"\n  }\n}',
        );
    });

    it('collapses each header onto a single line', () => {
        const text = harJsonStringify({
            headers: [
                { name: 'content-type', value: 'text/plain' },
                { name: 'x-a', value: '1' },
            ],
        });

        expect(text).toBe(
            '{\n  "headers": [\n    { "name": "content-type", "value": "text/plain" },\n' +
                '    { "name": "x-a", "value": "1" }\n  ]\n}',
        );
    });

    it('collapses timings onto a single line', () => {
        expect(harJsonStringify({ timings: { send: 0, wait: 1, receive: 2 } })).toBe(
            '{\n  "timings": { "send": 0, "wait": 1, "receive": 2 }\n}',
        );
    });

    it('drops undefined values', () => {
        expect(harJsonStringify({ kept: 1, dropped: undefined })).toBe('{\n  "kept": 1\n}');
    });

    it('renders empty objects and arrays inline', () => {
        expect(harJsonStringify({ a: {}, b: [] })).toBe('{\n  "a": {},\n  "b": []\n}');
    });

    it('round-trips through JSON.parse', () => {
        const value = {
            log: {
                entries: [
                    { request: { headers: [{ name: 'a', value: 'b' }] }, timings: { send: 1 } },
                ],
            },
        };

        expect(JSON.parse(harJsonStringify(value))).toStrictEqual(value);
    });
});
