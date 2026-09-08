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

function validateMigratedRoot(contents, file, constructors) {
  for (const constructor of constructors) assert.match(contents, new RegExp(`import ${constructor} from`), `${file} lost ${constructor}`);
  assert.doesNotMatch(contents, /<button\b/, `${file} reintroduced a native button`);
  assert.doesNotMatch(contents, /<(input|textarea)\b/, `${file} reintroduced a native text control`);
}

test('operations control inventory names every migrated surface and its official element', () => {
  const inventory = source('operations-controls-inventory.md');
  for (const value of ['Analyze', 'Monitor', 'Operate', 'Build', 'Code', 'Deploy', 'Pipelines', 'Repository', 'Secure', 'Security', 'MaterialTextField', 'MaterialTextButton', 'MaterialIconButton', 'MaterialCheckbox', 'MaterialButton', 'md-filled-text-field', 'md-text-button', 'md-icon-button', 'md-checkbox']) assert.match(inventory, new RegExp('`?' + value.replace(/[|\\{}()[\]^$+*?.]/g, '\\$&') + '`?'));
});

test('migrated operations controls use registered wrapper constructors and no native button or text input remains at each migrated root', () => {
  const expectations = {
    'Analyze/Analyze.vue': ['MaterialTextField', 'MaterialTextButton', 'MaterialIconButton'],
    'Monitor/Monitor.vue': ['MaterialTextField', 'MaterialTextButton'],
    'Operate/Operate.vue': ['MaterialTextField', 'MaterialTextButton'],
  };
  for (const [file, constructors] of Object.entries(expectations)) {
    const contents = source(file);
    validateMigratedRoot(contents, file, constructors);
  }
});

test('negative mutated-source cases reject a restored native button and a removed wrapper import, then accept restoration', () => {
  const file = 'Analyze/Analyze.vue';
  const original = source(file);
  const nativeButton = original.replace('<material-icon-button', '<button');
  assert.throws(() => validateMigratedRoot(nativeButton, file, ['MaterialTextField', 'MaterialTextButton', 'MaterialIconButton']), /native button/);
  const missingImport = original.replace("import MaterialTextField from '../../components/material_text_field';", '');
  assert.throws(() => validateMigratedRoot(missingImport, file, ['MaterialTextField', 'MaterialTextButton', 'MaterialIconButton']), /lost MaterialTextField/);
  assert.doesNotThrow(() => validateMigratedRoot(original, file, ['MaterialTextField', 'MaterialTextButton', 'MaterialIconButton']));
});

test('registered wrapper constructors render the exact official Material Web tags', () => {
  const expectedTags = {
    material_text_field: 'md-filled-text-field',
    material_text_button: 'md-text-button',
    material_icon_button: 'md-icon-button',
    material_checkbox: 'md-checkbox',
    material_button: 'md-filled-button',
  };
  for (const [moduleName, tag] of Object.entries(expectedTags)) {
    const contents = fs.readFileSync(path.join(components, `${moduleName}.js`), 'utf8');
    if (moduleName === 'material_button') assert.match(contents, new RegExp(`['\"]${tag}['\"]`), `${moduleName} no longer maps filled buttons to ${tag}`);
    else assert.match(contents, new RegExp(`h\\(\\s*['\"]${tag}['\"]`), `${moduleName} no longer constructs ${tag}`);
  }
});
