// In case when test finished, but some async operations are not and it generate
// unhandled rejection, jest process will just fail with unhandled rejection error
// Issue is known for 5+ years, but seems that nobody cares. And this is the only way
// how to circumvent it
// https://github.com/jestjs/jest/issues/9210
process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});
