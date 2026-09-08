require('../../config/helpers/patched_crypto');
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const webpack = require('webpack');
const materialWebLoader = require('../../config/helpers/material_web_loader');
const root = path.resolve(__dirname, '../..');

test('official Material Web compiles with the production loader and fails without it', async () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'material-gitlab-web-bundle-'));
  const compile = (rules, filename) => new Promise((resolve, reject) => webpack({
    mode: 'production',
    context: root,
    entry: path.join(root, 'app/assets/javascripts/material_system/components/register.js'),
    devtool: false,
    output: { path: directory, filename, hashFunction: 'sha256' },
    optimization: { minimize: false },
    module: { rules: [{ test: /\.js$/, include: path.join(root, 'app'), loader: 'babel-loader' }, ...rules] },
    resolve: { extensions: ['.js'], modules: [path.join(root, 'node_modules')] },
    resolveLoader: { modules: [path.join(root, 'node_modules')] },
  }, (error, stats) => error ? reject(error) : resolve(stats)));
  try {
    const negative = await compile([], 'negative.js');
    assert.equal(negative.hasErrors(), true, 'Missing production loader must reject modern Lit syntax');
    assert.match(negative.toString({ all: false, errors: true }), /Module parse failed/);
    assert.match(negative.toString({ all: false, errors: true }), /lit-html|reactive-element/);
    const positive = await compile([materialWebLoader], 'positive.js');
    assert.equal(positive.hasErrors(), false, positive.toString({ all: false, errors: true }));
    assert.match(fs.readFileSync(path.join(directory, 'positive.js'), 'utf8'), /md-filled-text-field/);
  } finally {
    assert.equal(path.dirname(directory), path.resolve(os.tmpdir()));
    fs.rmSync(directory, { recursive: true, force: true });
  }
});
