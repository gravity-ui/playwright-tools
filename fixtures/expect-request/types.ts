import type { ExpectRequestFnMatcher, ExpectRequestFnOptions } from '../../actions/expect-request';

export type ExpectRequestFn = (
    url: string | RegExp,
    matcher?: ExpectRequestFnMatcher,
    options?: ExpectRequestFnOptions,
) => Promise<void>;

export type ExpectRequestTestArgs = {
    expectRequest: ExpectRequestFn;
};
export type ExpectRequestTestOptions = {};

export type ExpectRequestWorkerArgs = {};
export type ExpectRequestWorkerOptions = {};

export type ExpectRequestTestFixtures = ExpectRequestTestArgs & ExpectRequestTestOptions;
export type ExpectRequestWorkerFixtures = ExpectRequestWorkerArgs & ExpectRequestWorkerOptions;

export type ExpectRequestFixtures = ExpectRequestTestFixtures & ExpectRequestWorkerFixtures;

export type ExpectRequestFixturesBuilderParams = {};
