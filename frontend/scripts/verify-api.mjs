import { execSync } from 'node:child_process';

execSync('npm run gen:api', { stdio: 'inherit' });

const changed = execSync('git status --porcelain -- src/api/generated', { encoding: 'utf8' }).trim();
if (changed) {
  console.error('Generated API files are out of date. Run `npm run gen:api` and commit the changes.');
  process.exit(1);
}

console.log('generated API files are up to date');
