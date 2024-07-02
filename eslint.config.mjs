import { fileURLToPath } from 'node:url';
// @ts-ignore
import config from '@ctrl/eslint-config-biome';
import { includeIgnoreFile } from '@eslint/compat';
import path from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const gitignorePath = path.resolve(__dirname, '.gitignore');

export default [
  includeIgnoreFile(gitignorePath),
  {
    ignores: ['dist', 'docs', 'eslint.config.mjs'],
  },
  ...config,
];
