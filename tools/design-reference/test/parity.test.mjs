import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { runNegativeRegression, validateInventory } from '../scripts/parity-guard.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const inventoryPath = path.join(root, 'design', 'parity-inventory.json');
const inventory = JSON.parse(fs.readFileSync(inventoryPath, 'utf8'));

test('hand-written inventory contains exactly the 25 checked-in references', () => {
  const verdict = validateInventory(inventory, { root });
  assert.equal(verdict.valid, true, verdict.errors.join('\n'));
  assert.equal(inventory.contracts.length, 25);
});

test('negative regression turns red for every required parity boundary and green after restore', () => {
  const verdict = runNegativeRegression(inventory);
  assert.equal(verdict.valid, true, verdict.failures.join(', '));
  assert.equal(verdict.cases, 25 * 24);
});

test('stale reference hashes are rejected', () => {
  const broken = structuredClone(inventory);
  broken.contracts[0].referenceHash = '0'.repeat(64);
  const verdict = validateInventory(broken, { root });
  assert.equal(verdict.valid, false);
  assert.ok(verdict.errors.some((error) => error.includes('referenceHash is stale')));
});

test('pending evidence is explicit and cannot claim a fabricated hash', () => {
  const broken = structuredClone(inventory);
  broken.contracts[0].evidence.referenceRaw.sha256 = 'a'.repeat(64);
  const verdict = validateInventory(broken, { root });
  assert.equal(verdict.valid, false);
  assert.ok(verdict.errors.some((error) => error.includes('pending evidence must not claim a hash')));
});
