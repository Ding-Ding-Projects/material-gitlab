import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import test from 'node:test';

test('packages a browser-safe renderer behind the preload bridge', () => {
  const rendererUrl = new URL('../app-dist/renderer/app.js', import.meta.url);
  assert.equal(existsSync(rendererUrl), true, 'compiled renderer app.js must survive the asset copy');
  const renderer = readFileSync(rendererUrl, 'utf8');
  const preload = readFileSync(new URL('../app-dist/preload.js', import.meta.url), 'utf8');
  assert.doesNotMatch(renderer, /\brequire\s*\(|\bexports\b|Object\.defineProperty/);
  assert.match(renderer, /instantBridge/);
  assert.doesNotMatch(preload, /require\("\.\/shared\//);
  assert.match(preload, /gitlab-instant\/readiness/);
});
