import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores([
    'dist', 'dist-ssr', 'node_modules', 'functions', 'dataconnect',
    'src/dataconnect-generated/**', 'scripts/**', 'patches/**', 'docs/**',
  ]),
  {
    files: ['src/**/*.{js,jsx}'],
    extends: [
      js.configs.recommended,
      reactHooks.configs['recommended-latest'],
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 'latest',
      globals: {
        ...globals.browser,
        ...globals.es2024,
        gtag: 'readonly', dataLayer: 'readonly',
        PaystackPop: 'readonly', FlutterwaveCheckout: 'readonly',
        Sentry: 'readonly',
      },
      parserOptions: { ecmaVersion: 'latest', ecmaFeatures: { jsx: true }, sourceType: 'module' },
    },
    rules: {
      'no-unused-vars': ['warn', { varsIgnorePattern: '^[A-Z_]', argsIgnorePattern: '^_' }],
      'react-hooks/exhaustive-deps': 'warn',
      'react-refresh/only-export-components': 'warn',
      'no-empty': ['warn', { allowEmptyCatch: true }],
    },
  },
  {
    files: ['vite.config.js', 'tailwind.config.js', 'postcss.config.js', 'eslint.config.js'],
    languageOptions: { ecmaVersion: 'latest', globals: { ...globals.node }, sourceType: 'module' },
    rules: { 'no-unused-vars': 'off' },
  },
])
