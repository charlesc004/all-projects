import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import nextVitals from 'eslint-config-next/core-web-vitals';

export default [
  {
    ignores: [
      '**/node_modules/**',
      '**/.next/**',
      '**/.cache/**',
      '**/dist/**',
      '**/coverage/**',
      '**/.postgres/**',
      '**/next-env.d.ts',
      '**/prisma/migrations/**',
      'test-results/**',
      'playwright-report/**',
    ],
  },
  ...nextVitals.map((config) => ({ ...config, files: ['apps/web/**/*.{ts,tsx,js,jsx}'] })),
  { files: ['apps/web/**/*.{ts,tsx,js,jsx}'], settings: { next: { rootDir: 'apps/web/' } } },
  { ...js.configs.recommended, files: ['apps/api/**/*.ts', 'packages/**/*.ts'] },
  ...tseslint.configs.recommended.map((config) => ({
    ...config,
    files: ['apps/api/**/*.ts', 'packages/**/*.ts'],
  })),
  {
    files: ['apps/api/**/*.ts'],
    languageOptions: {
      parserOptions: { experimentalDecorators: true },
      globals: {
        process: 'readonly',
        console: 'readonly',
        Buffer: 'readonly',
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
        setInterval: 'readonly',
        clearInterval: 'readonly',
        describe: 'readonly',
        it: 'readonly',
        expect: 'readonly',
        jest: 'readonly',
        beforeEach: 'readonly',
        afterEach: 'readonly',
        beforeAll: 'readonly',
        afterAll: 'readonly',
        require: 'readonly',
        __dirname: 'readonly',
        module: 'readonly',
      },
    },
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
    },
  },
];
