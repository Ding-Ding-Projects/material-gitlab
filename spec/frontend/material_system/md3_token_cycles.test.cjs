const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const path = require('node:path');

// A custom property whose value refers back to itself, directly or through other custom
// properties declared in the same block, is a cycle. Browsers treat every property in a
// cycle as invalid, so it computes to nothing and every consumer silently loses its value.
// That happened to `--gl-md3-card` in the light token block and erased the form focus ring.

const root = path.resolve(__dirname, '../../..');
const stylesheets = path.join(root, 'app/assets/stylesheets');

function scssFiles(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return scssFiles(full);
    return entry.name.endsWith('.scss') ? [full] : [];
  });
}

// Collects custom property declarations per block, where a block is everything between a
// `{` and its matching `}`. Nested blocks are separate scopes.
function blocksOf(source) {
  const text = source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');
  const blocks = [];
  const stack = [];
  let declaration = '';
  for (const char of text) {
    if (char === '{') {
      stack.push(new Map());
      declaration = '';
    } else if (char === '}') {
      const finished = stack.pop();
      if (finished && finished.size) blocks.push(finished);
      declaration = '';
    } else if (char === ';') {
      const match = /^\s*(--[\w-]+)\s*:\s*([\s\S]+)$/.exec(declaration);
      if (match && stack.length) stack[stack.length - 1].set(match[1], match[2]);
      declaration = '';
    } else {
      declaration += char;
    }
  }
  return blocks;
}

function cyclesIn(block) {
  const refs = new Map();
  for (const [name, value] of block) {
    refs.set(name, [...value.matchAll(/var\(\s*(--[\w-]+)/g)].map((m) => m[1]).filter((ref) => block.has(ref)));
  }
  const found = [];
  const visit = (name, trail) => {
    if (trail.includes(name)) {
      found.push(trail.slice(trail.indexOf(name)).concat(name).join(' -> '));
      return;
    }
    for (const next of refs.get(name) || []) visit(next, trail.concat(name));
  };
  for (const name of refs.keys()) visit(name, []);
  return [...new Set(found)];
}

test('no stylesheet declares a cyclic custom property', () => {
  const problems = [];
  for (const file of scssFiles(stylesheets)) {
    for (const block of blocksOf(fs.readFileSync(file, 'utf8'))) {
      for (const cycle of cyclesIn(block)) problems.push(`${path.relative(root, file)}: ${cycle}`);
    }
  }
  assert.deepEqual(problems, []);
});

test('the guard itself catches a direct and an indirect cycle', () => {
  const [direct] = blocksOf(':root { --a: #fff; --a: var(--a); }');
  assert.deepEqual(cyclesIn(direct), ['--a -> --a']);
  const [indirect] = blocksOf(':root { --a: var(--b); --b: var(--a); --c: var(--d, red); }');
  assert.ok(cyclesIn(indirect).length > 0);
  const [clean] = blocksOf(':root { --a: #fff; --b: var(--a); }');
  assert.deepEqual(cyclesIn(clean), []);
});
