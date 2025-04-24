import type { ExpectRequestFnMatcher, ExpectRequestFnOptions } from '../../actions/expect-request';

export type ExpectRequestFn = (
    url: string | RegExp,
    matcher?: ExpectRequestFnMatcher,
    options?: ExpectRequestFnOptions,
) => Promise<void>;

export interface ExpectRequestTestArgs {
    expectRequest: ExpectRequestFn;
}
