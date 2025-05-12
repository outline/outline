import { FlatCompat } from '@eslint/eslintrc';
import js from '@eslint/js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
  recommendedConfig: js.configs.recommended,
});

export default [
  ...compat.extends(
    'eslint:recommended',
    'plugin:import/errors',
    'plugin:import/warnings',
    'plugin:import/typescript',
    'plugin:react/recommended',
    'plugin:react-hooks/recommended',
    'plugin:jsx-a11y/recommended',
    'plugin:prettier/recommended'
  ),
  ...compat.config({
    parser: '@typescript-eslint/parser',
    plugins: ['@typescript-eslint', 'eslint-plugin-import', 'lodash'],
    settings: {
      react: {
        version: 'detect',
      },
      'import/resolver': {
        typescript: {
          alwaysTryTypes: true,
        },
        node: {
          extensions: ['.js', '.jsx', '.ts', '.tsx'],
        },
      },
    },
    rules: {
      'no-console': 'error',
      'prefer-const': 'error',
      'react/prop-types': 'off',
      'react/jsx-no-target-blank': 'off',
      'react/self-closing-comp': 'error',
      'react/jsx-curly-brace-presence': [
        'error',
        { props: 'never', children: 'never' },
      ],
      'lodash/import-scope': [2, 'method'],
      'import/order': [
        'error',
        {
          'newlines-between': 'always',
          groups: [
            'builtin',
            'external',
            'internal',
            'parent',
            'sibling',
            'index',
          ],
          pathGroups: [
            {
              pattern: 'styled-components',
              group: 'external',
              position: 'before',
            },
            {
              pattern: '{~/,~/**}',
              group: 'internal',
              position: 'after',
            },
          ],
          pathGroupsExcludedImportTypes: ['builtin'],
          alphabetize: {
            order: 'asc',
            caseInsensitive: true,
          },
        },
      ],
    },
  }),
  {
    ignores: [
      'build/**',
      'coverage/**',
      'server/migrations/**',
      'server/migrations-test/**',
      'node_modules/**',
      'public/**',
      'server/test/support/fixtures/**',
      'server/test/scripts/**',
      'plugins/*/dist/**',
      'plugins/*/node_modules/**',
      'plugins/*/coverage/**',
      'plugins/*/build/**',
      'plugins/*/public/**',
      'plugins/*/migrations/**',
      'plugins/*/migrations-test/**',
      'plugins/*/test/support/fixtures/**',
      'plugins/*/test/scripts/**',
    ],
  },
];

