export type TestSlugResult = string;

export type TestSlugTestArgs = {
    testSlug: TestSlugResult;
};
export type TestSlugTestOptions = {};

export type TestSlugWorkerArgs = {};
export type TestSlugWorkerOptions = {};

export type TestSlugTestFixtures = TestSlugTestArgs & TestSlugTestOptions;
export type TestSlugWorkerFixtures = TestSlugWorkerArgs & TestSlugWorkerOptions;

export type TestSlugFixtures = TestSlugTestFixtures & TestSlugWorkerFixtures;

export type TestSlugFixturesBuilderParams = {};
