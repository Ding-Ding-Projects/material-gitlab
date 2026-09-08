const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { test } = require('node:test');

const root = path.resolve(__dirname, '../../..');
const surfaces = path.join(root, 'app/assets/javascripts/material_system/surfaces');
const components = path.join(root, 'app/assets/javascripts/material_system/components');

function source(relative) {
  return fs.readFileSync(path.join(surfaces, relative), 'utf8');
}

test('operations control inventory names every migrated surface and its official element', () => {
  const inventory = source('operations-controls-inventory.md');
  for (const value of ['Analyze', 'Monitor', 'Operate', 'MaterialTextField', 'MaterialTextButton', 'MaterialIconButton', 'md-filled-text-field', 'md-text-button', 'md-icon-button']) assert.match(inventory, new RegExp('`?' + value.replace(/[.*+?^${}()|[\\]\\]/g, '\\$&') + '`?'));
});

test('migrated operations controls use registered wrapper constructors and no native button or text input remains at each migrated root', () => {
  const expectations = {
    'Analyze/Analyze.vue': ['MaterialTextField', 'MaterialTextButton', 'MaterialIconButton'],
    'Monitor/Monitor.vue': ['MaterialTextField', 'MaterialTextButton'],
    'Operate/Operate.vue': ['MaterialTextField', 'MaterialTextButton'],
  };
  for (const [file, constructors] of Object.entries(expectations)) {
    const contents = source(file);
    for (const constructor of constructors) assert.match(contents, new RegExp(`import ${constructor} from`), `${file} lost ${constructor}`);
    assert.doesNotMatch(contents, /<button\\b/, `${file} reintroduced a native button`);
    assert.doesNotMatch(contents, /<(input|textarea)\\b/, `${file} reintroduced a native text control`);
  }
});

test('registered wrapper constructors render the exact official Material Web tags', () => {
  const expectedTags = {
    material_text_field: 'md-filled-text-field',
    material_text_button: 'md-text-button',
    material_icon_button: 'md-icon-button',
  };
  for (const [moduleName, tag] of Object.entries(expectedTags)) {
    const contents = fs.readFileSync(path.join(components, `${moduleName}.js`), 'utf8');
    assert.match(contents, new RegExp(`h\\(\\s*['\"]${tag}['\"]`), `${moduleName} no longer constructs ${tag}`);
  }
});
