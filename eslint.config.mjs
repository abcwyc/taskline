import { dirname } from 'path';
import { fileURLToPath } from 'url';
import { FlatCompat } from '@eslint/eslintrc';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
   baseDirectory: __dirname,
});

const eslintConfig = [
   {
      ignores: [
         '.next/**',
         'node_modules/**',
         'next-env.d.ts',
         'coverage/**',
         'public/**',
         'prisma/migrations/**',
         '*.config.{js,mjs,ts,mts}',
      ],
   },
   ...compat.extends('next/core-web-vitals', 'next/typescript'),
   {
      // Vendored bazza/ui data-table-filter (kept close to upstream for easy updates)
      files: ['components/data-table-filter/**/*.{ts,tsx}'],
      rules: {
         '@typescript-eslint/no-unused-vars': 'off',
         '@typescript-eslint/no-explicit-any': 'off',
         '@typescript-eslint/no-this-alias': 'off',
         'react-hooks/rules-of-hooks': 'off',
         'react-hooks/exhaustive-deps': 'off',
      },
   },
   {
      // test helpers + one-off scripts: looser
      files: ['test/**/*.ts', 'scripts/**/*.{ts,mjs}'],
      rules: {
         '@typescript-eslint/no-explicit-any': 'off',
      },
   },
];

export default eslintConfig;
