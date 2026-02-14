import { readFileSync } from 'node:fs';

const attemptsSource = readFileSync(new URL('../src/attempts.ts', import.meta.url), 'utf8');
const requiredChecks = ['request.solved == null', 'request.dateSolved == null', 'request.timeMinutes == null'];
for (const check of requiredChecks) {
  if (!attemptsSource.includes(check)) {
    throw new Error(`Missing empty-predicate clause: ${check}`);
  }
}

const appSource = readFileSync(new URL('../src/App.tsx', import.meta.url), 'utf8');
if (!appSource.includes('Farthest category')) {
  throw new Error('Expected dashboard progress render in App.tsx');
}
if (!appSource.includes('Latest solved')) {
  throw new Error('Expected latest solved panel render in App.tsx');
}
console.log('tests passed');
