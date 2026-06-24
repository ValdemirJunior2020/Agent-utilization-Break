import js from '@eslint/js';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import tseslint from 'typescript-eslint';

export default [
  {
    ignores: [
      'dist',
      'node_modules',
      '.netlify',
      'coverage',
      'serviceAccountKey.json',
      '*.config.js'
    ],
  },

  js.configs.recommended,
  ...tseslint.configs.recommended,

  {
    files: ['src/**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: {
        window: 'readonly',
        document: 'readonly',
        navigator: 'readonly',
        confirm: 'readonly',
        alert: 'readonly',
        console: 'readonly',
        Blob: 'readonly',
        URL: 'readonly',
        File: 'readonly',
        FileReader: 'readonly',
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
        localStorage: 'readonly',
      },
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,

      // This rule is too aggressive for normal async data loading pages.
      'react-hooks/set-state-in-effect': 'off',

      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': 'warn',
      'no-unused-vars': 'off',
      'no-empty': 'off',
      'no-useless-assignment': 'off',
    },
  },

  {
    files: ['scripts/**/*.{js,mjs,ts}', '*.config.{js,ts}', 'vite.config.ts'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: {
        console: 'readonly',
        process: 'readonly',
        Buffer: 'readonly',
        __dirname: 'readonly',
        __filename: 'readonly',
      },
    },
    rules: {
      'no-undef': 'off',
      '@typescript-eslint/no-require-imports': 'off',
    },
  },
];