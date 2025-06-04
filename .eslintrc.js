/* global module, __dirname */

module.exports = {
    extends: [
        '@gravity-ui/eslint-config',
        '@gravity-ui/eslint-config/prettier',
        '@gravity-ui/eslint-config/import-order'
    ],
    root: true,
    rules: {
        'valid-jsdoc': 'off',
        '@typescript-eslint/no-non-null-assertion': 'off',
        '@typescript-eslint/consistent-type-imports': [
            'error',
            {
                prefer: 'type-imports',
            },
        ],
        '@typescript-eslint/no-redeclare': 'off',
        '@typescript-eslint/no-shadow': 'off',
        'no-implicit-globals': 'off',
        'no-void': ['error', { allowAsStatement: true }],
        'no-console': [
            'warn',
            {
                'allow': ['info', 'warn', 'error']
            }
        ],
    },
    overrides: [
        {
            files: ['*.ts', '**/*.ts'],
            parser: '@typescript-eslint/parser',
            plugins: ['@typescript-eslint'],
            parserOptions: {
                tsconfigRootDir: __dirname,
                project: ['./tsconfig.json'],
            },
            rules: {
                '@typescript-eslint/no-misused-promises': [
                    'error',
                    {
                        checksVoidReturn: false,
                    },
                ],
                '@typescript-eslint/no-floating-promises': 'error',
            },
        },
    ],
    ignorePatterns: [
        '*.d.ts',
        '*.js',
        '!/.eslintrc.js',
    ],
};
