import { readFileSync } from 'node:fs';

const source = readFileSync(new URL('../src/attempts.ts', import.meta.url), 'utf8');
const requiredChecks = ['request.solved == null', 'request.dateSolved == null', 'request.timeMinutes == null'];
for (const check of requiredChecks) {
  if (!source.includes(check)) {
    throw new Error(`Missing empty-predicate clause: ${check}`);
  }
}
console.log('tests passed');
