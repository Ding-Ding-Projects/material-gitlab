import { existsSync, readFileSync, statSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join } from 'node:path';

const output = join(process.cwd(), 'dist', 'squirrel-windows', 'squirrel-windows');
const setup = join(output, 'Material-GitLab-Deployer-0.1.0-Setup.exe');
const releases = join(output, 'RELEASES');
const nupkg = join(output, 'material-gitlab-deployer-0.1.0-full.nupkg');

for (const file of [setup, releases, nupkg]) {
  if (!existsSync(file) || statSync(file).size === 0) throw new Error(`Missing or empty Squirrel asset: ${file}`);
}
const index = readFileSync(releases, 'utf8');
if (!index.includes('material-gitlab-deployer-0.1.0-full.nupkg')) throw new Error('RELEASES does not reference the full package');
const digest = (file) => createHash('sha256').update(readFileSync(file)).digest('hex');
for (const file of [setup, releases, nupkg]) console.log(`${file}\t${statSync(file).size} bytes\tsha256=${digest(file)}`);
console.log('Squirrel assets verified; code signing remains disabled by package configuration.');
