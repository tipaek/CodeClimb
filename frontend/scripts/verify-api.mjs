import { execSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';

const generatedFile = new URL('../src/api/generated/openapi.ts', import.meta.url);
const before = readFileSync(generatedFile, 'utf8');

execSync('npm run gen:api', { stdio: 'inherit' });

const after = readFileSync(generatedFile, 'utf8');

const stripBanner = (source) => source.replace(/^\/\*\*[\s\S]*?\*\/\n\n/, '').trimEnd();

if (before === after) {
  console.log('generated API files are up to date');
  process.exit(0);
}

if (stripBanner(before) === stripBanner(after)) {
  writeFileSync(generatedFile, before, 'utf8');
  console.log('generated API files are up to date (banner-only drift ignored)');
  process.exit(0);
}

console.error('Generated API files are out of date. Run `npm run gen:api` and commit the changes.');
process.exit(1);
