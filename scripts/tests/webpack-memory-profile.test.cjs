require('../../config/helpers/patched_crypto');
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const webpack = require('webpack');
const profile = require('../../config/helpers/webpack_memory_profile');

test('bounded profile keeps defaults intact and rejects unsupported switches', () => {
  for (const value of [undefined, '', 'false']) assert.deepEqual(profile(value, true), {});
  for (const value of ['1', 'TRUE', '-1']) assert.throws(() => profile(value, false), /must be true or false/);
  const bounded = profile('true', false);
  assert.equal(bounded.minimizer[0].options.parallel, false);
  assert.equal(bounded.minimizer[0].options.sourceMap, false);
});

test('bounded profile actually minifies executable production output', async () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'material-gitlab-minifier-'));
  try {
    fs.writeFileSync(path.join(directory, 'input.js'), '/* minifier fixture marker */ module.exports = function addition(left, right) { return left + right; };');
    const stats = await new Promise((resolve, reject) => webpack({
      mode: 'production',
      target: 'node',
      entry: path.join(directory, 'input.js'),
      devtool: false,
      output: { path: directory, filename: 'output.js', libraryTarget: 'commonjs2', hashFunction: 'sha256' },
      optimization: profile('true', false),
    }, (error, result) => error ? reject(error) : resolve(result)));
    assert.equal(stats.hasErrors(), false, stats.toString({ all: false, errors: true }));
    const output = path.join(directory, 'output.js');
    assert.equal(require(output)(19, 23), 42);
    assert.doesNotMatch(fs.readFileSync(output, 'utf8'), /minifier fixture marker/);
    assert.equal(fs.existsSync(`${output}.map`), false);
  } finally {
    assert.equal(path.dirname(directory), path.resolve(os.tmpdir()));
    fs.rmSync(directory, { recursive: true, force: true });
  }
});
