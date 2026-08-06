import { access } from 'node:fs/promises';
import { resolve } from 'node:path';

const projectDir = process.cwd();

for (const relativePath of [
  'server.js',
  'scripts/smoke-test.mjs',
  'src/openapi.js',
]) {
  await access(resolve(projectDir, relativePath));
}

console.log(`Validated project structure in ${projectDir}`);
