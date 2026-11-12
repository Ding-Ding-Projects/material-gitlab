import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = (path) => readFile(new URL(path, import.meta.url), 'utf8');

test('the renderer is sandboxed with no Node access', async () => {
  const main = await read('../src/main.ts');
  assert.match(main, /^\s*contextIsolation: true,$/m);
  assert.match(main, /^\s*nodeIntegration: false,$/m);
  assert.match(main, /^\s*sandbox: true,$/m);
  assert.match(main, /^\s*frame: false,$/m);
});

test('PowerShell is only spawned with an allowlisted host.ps1 command', async () => {
  const main = await read('../src/main.ts');
  const spawns = main.match(/spawn\(\s*'powershell\.exe',\s*\[[^\n]*\]/g) || [];
  assert.equal(spawns.length, 1);
  assert.match(spawns[0], /, script, HOST_ACTIONS\[action\]\]$/);
  assert.match(main, /^\s*if \(!isHostAction\(action\)\) return \{ ok: false, error: 'action' \};$/m);
});

test('the preload exposes named calls only', async () => {
  const preload = await read('../src/preload.ts');
  assert.doesNotMatch(preload, /ipcRenderer\.(invoke|send)\(\s*[a-z]/);
  assert.doesNotMatch(preload, /\brequire\(|\bprocess\.\w/);
  assert.match(preload, /^contextBridge\.exposeInMainWorld\('host', \{$/m);
});

test('the window allows no remote script and no navigation away', async () => {
  const html = await read('../src/renderer/index.html');
  assert.match(html, /script-src 'self';/);
  assert.match(html, /default-src 'none';/);
  const main = await read('../src/main.ts');
  assert.match(main, /^\s*window\.webContents\.on\('will-navigate', \(event\) => event\.preventDefault\(\)\);$/m);
});

test('.env is never copied over by the host file sync', async () => {
  const main = await read('../src/main.ts');
  const sync = main.slice(main.indexOf('async function syncHostFiles'), main.indexOf('// ---- Running host.ps1'));
  assert.doesNotMatch(sync, /\.env/);
  assert.match(sync, /await rm\(to, \{ recursive: true, force: true \}\);/);
  assert.match(sync, /const to = join\(target, 'deploy', part\);/);
});

test('packaging stays unsigned Squirrel.Windows and bundles the host files', async () => {
  const pkg = JSON.parse(await read('../package.json'));
  assert.equal(pkg.build.win.signExecutable, false);
  assert.equal(pkg.build.forceCodeSigning, false);
  assert.deepEqual(pkg.build.win.target.map((t) => t.target), ['squirrel']);
  const to = pkg.build.extraResources.map((r) => r.to);
  assert.deepEqual(to, ['host/docker-compose.yml', 'host/deploy/windows', 'host/deploy/docker']);
});
