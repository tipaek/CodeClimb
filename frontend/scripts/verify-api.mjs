import { execSync } from 'node:child_process';

execSync('npm run gen:api', { stdio: 'inherit' });
execSync('git diff --exit-code -- src/api/generated', { stdio: 'inherit' });
console.log('api generation is up to date');
