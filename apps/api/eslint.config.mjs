import { dirname } from 'path';
import { fileURLToPath } from 'url';
import sonarjs from 'eslint-plugin-sonarjs';
import baseConfig from '../../eslint.config.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));

export default [
  ...baseConfig,
  sonarjs.configs.recommended,
  {
    files: ['**/*.ts'],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.app.json', './tsconfig.spec.json'],
        tsconfigRootDir: __dirname,
      },
    },
    rules: {
      // NestJS: always use the Logger service, never console
      'no-console': 'error',

      // NestJS: explicit return types on class methods aid DI introspection
      '@typescript-eslint/explicit-function-return-type': [
        'error',
        {
          allowExpressions: true,
          allowTypedFunctionExpressions: true,
          allowHigherOrderFunctions: true,
          allowConciseArrowFunctionExpressionsStartingWithVoid: true,
        },
      ],

      // Type-aware rules (require parserOptions.project)
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/no-misused-promises': 'error',
      '@typescript-eslint/no-unnecessary-type-assertion': 'error',
      '@typescript-eslint/await-thenable': 'error',
      '@typescript-eslint/prefer-optional-chain': 'warn',

      // Code quality via SonarJS
      'sonarjs/cognitive-complexity': ['warn', 15],
      'sonarjs/no-duplicate-string': ['warn', { threshold: 5 }],
      'sonarjs/no-identical-functions': 'warn',

      // Immutability
      'no-param-reassign': ['error', { props: false }],
    },
  },
  {
    // Relax rules in test/spec files
    files: ['**/*.spec.ts', '**/*.e2e-spec.ts'],
    rules: {
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/no-floating-promises': 'off',
      'no-console': 'off',
      'sonarjs/no-duplicate-string': 'off',
    },
  },
];
