import js from '@eslint/js';
import tseslint from 'typescript-eslint';

export default [
  {
    ignores: [
      'node_modules/**',
      'dist/**',
      '.build/**',
      'crm/**',
      '.next/**',
      'backups/**',
      'test-results/**',
      'test-results-learning/**',
      'playwright-report/**',
      'docs/**',
      'coverage/**',
      'db/**',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': 'off',
      '@typescript-eslint/ban-ts-comment': 'off',
      'no-empty': 'off',
      'prefer-const': 'off',
      'no-unused-vars': 'off',
      'no-undef': 'off',
    },
  },
];
