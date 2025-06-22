import { dirname } from 'path';
import { fileURLToPath } from 'url';
import { FlatCompat } from '@eslint/eslintrc';
import parser from '@typescript-eslint/parser';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  {
    files: ['**/*.ts', '**/*.tsx'],
    languageOptions: {
      parser,
      parserOptions: {
        project: './tsconfig.json',
        tsconfigRootDir: __dirname,
        sourceType: 'module',
      },
    },
  },
  ...compat.extends('next/core-web-vitals', 'next/typescript', 'eslint-config-airbnb-base'),
  {
    rules: {
      'import/no-unresolved': 'off',
      'import/extensions': 'off',
      allowImportingTsExtensions: 'off',
      'consistent-return': 'off',
      'no-nested-ternary': 'off',
    },
  },
];

export default eslintConfig;
