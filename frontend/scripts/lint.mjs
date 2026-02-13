import { readFileSync } from 'node:fs';

const source = readFileSync(new URL('../src/App.tsx', import.meta.url), 'utf8');
if (!source.includes('AuthGuard')) {
  throw new Error('Expected AuthGuard in App.tsx');
}
console.log('lint checks passed');
