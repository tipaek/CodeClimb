import { readFileSync } from 'node:fs';

const source = readFileSync(new URL('../src/types.ts', import.meta.url), 'utf8');
if (!source.includes("components['schemas']['UpsertAttemptRequest']")) {
  throw new Error('Expected UpsertAttemptRequest to come from generated OpenAPI schema');
}
console.log('typecheck placeholder passed');
