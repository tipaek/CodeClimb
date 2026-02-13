import { readFileSync } from 'node:fs';

const source = readFileSync(new URL('../src/types.ts', import.meta.url), 'utf8');
if (!source.includes('export interface UpsertAttemptRequest')) {
  throw new Error('Missing UpsertAttemptRequest type');
}
console.log('typecheck placeholder passed');
