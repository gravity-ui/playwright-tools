const os = require('os');

process.env.TZ = 'UTC';

module.exports = {
    setupFiles: ['<rootDir>/jest/unhandled-rejection-handler.js'],
    moduleFileExtensions: ['js', 'ts'],
    testEnvironment: 'node',
    testMatch: ['**/__tests__/**/?(*.)+(test).[jt]s'],
    testPathIgnorePatterns: ['<rootDir>/example/', '<rootDir>/node_modules/'],
    transform: {
        '^.+\\.ts$': ['ts-jest', { isolatedModules: true }],
    },
};
