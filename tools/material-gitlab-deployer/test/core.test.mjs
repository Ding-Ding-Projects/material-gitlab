import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFile } from 'node:fs/promises';

const require = createRequire(import.meta.url);
const { HOST_ACTIONS, isHostAction, parseHealth, safeExternalUrl } = require('../dist/core/actions.js');
const { readSettings, validateSettings, writeSettings } = require('../dist/core/envFile.js');
const { parseReleases, versionOf, isNewer } = require('../dist/core/releases.js');

test('only the five host.ps1 commands are reachable', () => {
  assert.deepEqual(Object.values(HOST_ACTIONS).sort(), ['health', 'logs-tail', 'status', 'stop', 'up']);
  for (const bad of ['', 'up', 'down', 'reset', '__proto__', 'constructor', 'start; rm', null, 1]) {
    assert.equal(isHostAction(bad), false, String(bad));
  }
  for (const good of Object.keys(HOST_ACTIONS)) assert.equal(isHostAction(good), true);
});

test('every host action exists as a command in host.ps1', async () => {
  const script = await readFile(new URL('../../../deploy/windows/host.ps1', import.meta.url), 'utf8');
  for (const command of Object.values(HOST_ACTIONS)) {
    assert.match(script, new RegExp(`^\\s*'${command}'\\s*\\{`, 'm'), command);
  }
});

test('health output is parsed and the address is constrained', () => {
  const ok = parseHealth('  docker: running\r\n  container: running healthy\r\n  address: http://192.168.1.20:8929\r\n');
  assert.deepEqual(ok, { docker: 'running', container: 'running healthy', address: 'http://192.168.1.20:8929' });
  const odd = parseHealth('  docker: maybe\n  address: javascript:alert(1)\n');
  assert.deepEqual(odd, { docker: 'unknown', container: 'absent', address: null });
});

test('external URLs are limited to http and https', () => {
  assert.equal(safeExternalUrl('http://gitlab.local:8929'), 'http://gitlab.local:8929/');
  for (const bad of ['file:///C:/Windows', 'javascript:alert(1)', 'ms-settings:', 'not a url', 42]) {
    assert.equal(safeExternalUrl(bad), null, String(bad));
  }
});

test('.env settings round-trip and keep unrelated lines', () => {
  const before = '# comment\r\nGITLAB_HOSTNAME=192.168.1.20\r\nGITLAB_ROOT_PASSWORD=keep-me\r\nGITLAB_MEMORY_LIMIT=10g\r\n';
  const read = readSettings(before);
  assert.deepEqual(read, { hostname: '192.168.1.20', httpPort: 8929, sshPort: 2229, memoryGb: 10, cpus: 4 });
  const after = writeSettings(before, { ...read, httpPort: 9000, memoryGb: 12 });
  assert.match(after, /^# comment\r\n/);
  assert.match(after, /^GITLAB_ROOT_PASSWORD=keep-me\r$/m);
  assert.match(after, /^GITLAB_MEMORY_LIMIT=12g\r$/m);
  assert.match(after, /^GITLAB_HTTP_PORT=9000\r$/m);
  assert.deepEqual(readSettings(after), { ...read, httpPort: 9000, memoryGb: 12 });
});

test('settings validation rejects unsafe or impossible values', () => {
  const good = { hostname: 'gitlab.lan', httpPort: 8929, sshPort: 2229, memoryGb: 8, cpus: 4 };
  assert.equal(validateSettings(good).ok, true);
  const cases = [
    [{ hostname: 'evil\nGITLAB_X=1' }, 'hostname'],
    [{ hostname: '-bad' }, 'hostname'],
    [{ httpPort: 80 }, 'httpPort'],
    [{ sshPort: 70000 }, 'sshPort'],
    [{ sshPort: 8929 }, 'samePorts'],
    [{ memoryGb: 2 }, 'memoryGb'],
    [{ cpus: 0.5 }, 'cpus'],
  ];
  for (const [patch, error] of cases) {
    const result = validateSettings({ ...good, ...patch });
    assert.equal(result.ok, false, JSON.stringify(patch));
    assert.ok(result.errors.includes(error), `${JSON.stringify(patch)} -> ${result.errors}`);
  }
  assert.equal(validateSettings(null).ok, false);
});

test('Squirrel RELEASES index parsing and version comparison', () => {
  const sha = 'A'.repeat(40);
  const index = parseReleases(`\uFEFF${sha} material-gitlab-deployer-0.2.0-full.nupkg 123\r\nnot a line\r\n${'b'.repeat(40)} material-gitlab-deployer-0.2.0-delta.nupkg 9\r\n`);
  assert.equal(index.length, 2);
  assert.deepEqual(index[0], { sha1: sha, file: 'material-gitlab-deployer-0.2.0-full.nupkg', size: 123 });
  assert.equal(versionOf(index[0].file), '0.2.0');
  assert.equal(versionOf(index[1].file), null);
  assert.equal(isNewer('0.10.0', '0.9.9'), true);
  assert.equal(isNewer('0.2.0', '0.2.0'), false);
  assert.equal(isNewer('0.1.9', '0.2.0'), false);
});
