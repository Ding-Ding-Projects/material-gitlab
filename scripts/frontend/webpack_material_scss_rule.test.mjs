import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const source = readFileSync(new URL('../../config/webpack.config.js', import.meta.url), 'utf8');

function validateScssRules(candidate) {
  assert.equal((candidate.match(/test: \/\\\.scss\$\//g) || []).length, 1);
  assert.equal((candidate.match(/test: \/\\\.css\$\//g) || []).length, 1);
  assert.match(candidate, /config\/webpack\/loaders\/material_scss_loader\.js/);
  assert.doesNotMatch(candidate, /test: \/\.css\$\//);
}

test('routes Vue and Material SCSS through the repository loader without widening the CSS rule', () => {
  validateScssRules(source);
});

test('turns red when the dedicated SCSS rule disappears', () => {
  const broken = source.replace('test: /\\.scss$/', 'test: /\\.material-style$/');
  assert.throws(() => validateScssRules(broken));
});
