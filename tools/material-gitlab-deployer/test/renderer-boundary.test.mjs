import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

test('keeps Node imports behind the isolated preload bridge', () => {
  const renderer = readFileSync(new URL('../dist/renderer/app.js', import.meta.url), 'utf8');
  const preload = readFileSync(new URL('../src/preload.ts', import.meta.url), 'utf8');

  assert.doesNotMatch(renderer, /\brequire\s*\(/);
  assert.doesNotMatch(renderer, /\bexports\b|Object\.defineProperty/);
  assert.match(preload, /ipcRenderer\.invoke\('deployer:lifecycle:plan'/);
  assert.match(renderer, /window\.deployer\.plan/);
  assert.match(renderer, /schemaVersion: 1/);
  assert.match(renderer, /input\('project-path', 'deploy'\)/);
  assert.doesNotMatch(renderer, /input\('project-path', '\.\/deploy'\)/);
  assert.doesNotMatch(renderer, /step\.args\.map/);
  assert.match(renderer, /step\.detail/);
});
