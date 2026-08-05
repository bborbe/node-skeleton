'use strict';

const tseslint = require('typescript-eslint');

const globals = {
  process: 'readonly',
  console: 'readonly',
  fetch: 'readonly',
  setTimeout: 'readonly',
  clearTimeout: 'readonly',
  module: 'writable',
  require: 'readonly',
  __dirname: 'readonly',
};

module.exports = tseslint.config(
  {
    files: ['**/*.js'],
    languageOptions: {
      ecmaVersion: 2024,
      sourceType: 'commonjs',
      globals,
    },
    rules: {
      'no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      'no-console': 'warn',
      eqeqeq: ['error', 'smart'],
      'prefer-const': 'error',
    },
  },
  {
    files: ['**/*.ts'],
    extends: [...tseslint.configs.recommended],
    languageOptions: {
      ecmaVersion: 2024,
      sourceType: 'commonjs',
      globals,
    },
    rules: {
      'no-console': 'warn',
      eqeqeq: ['error', 'smart'],
      'prefer-const': 'error',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      // Kept together with the tsconfig `erasableSyntaxOnly` gate — enum,
      // namespace, and parameter-property syntax would make `node src/*.ts`
      // require a build step.
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-non-null-assertion': 'error',
      // The whole point of this skeleton is CommonJS `.ts` with no build
      // step — Node's native type-stripping does not support ESM `import`
      // syntax inside a `"type": "commonjs"` package, so `require()` (with
      // an explicit `.ts` extension for local modules) is the only working
      // way to load another module. See node-service-guide.md#typescript.
      '@typescript-eslint/no-require-imports': 'off',
    },
  },
  { ignores: ['node_modules/', 'coverage/'] },
);
