import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { runNegativeRegression, validateCompletion, validateInventory } from '../scripts/parity-guard.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const inventoryPath = path.join(root, 'design', 'parity-inventory.json');
const inventory = JSON.parse(fs.readFileSync(inventoryPath, 'utf8'));

test('resolves design contracts from the repository root', () => {
  const mainSource = fs.readFileSync(new URL('../src/main.cjs', import.meta.url), 'utf8');
  assert.match(mainSource, /path\.resolve\(__dirname, '\.\.', '\.\.', '\.\.'\)/);
  assert.doesNotMatch(mainSource, /path\.resolve\(__dirname, '\.\.', '\.\.'\);/);
  assert.match(mainSource, /material-symbols-outlined\.woff2/);
  assert.match(mainSource, /frame: false/);
  assert.match(mainSource, /autoHideMenuBar: true/);
});

test('binds capture receipts to the exact current commit', () => {
  const captureSource = fs.readFileSync(new URL('../scripts/capture.mjs', import.meta.url), 'utf8');
  assert.match(captureSource, /sourceCommit !== currentCommit\(\)/);
  assert.match(captureSource, /full 40-character source commit/);
  assert.match(captureSource, /artifact-manifest/);
  assert.match(captureSource, /artifactFromManifest/);
  assert.match(captureSource, /font-proof/);
  assert.match(captureSource, /fallback fonts cannot complete parity/);
  assert.match(captureSource, /kind === 'reference' \? row\.referenceRoute : row\.productionRoute/);
});

test('hand-written inventory contains exactly the 25 checked-in references', () => {
  const verdict = validateInventory(inventory, { root });
  assert.equal(verdict.valid, true, verdict.errors.join('\n'));
  assert.equal(inventory.contracts.length, 25);
});

test('negative regression turns red for every required parity boundary and green after restore', () => {
  const verdict = runNegativeRegression(inventory);
  assert.equal(verdict.valid, true, verdict.failures.join(', '));
  assert.equal(verdict.cases, 25 * 27);
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

test('a rejected capture never writes a receipt fixture', () => {
  const fixture = path.join(root, 'tools', 'design-reference', 'test', `.tmp-rejected-capture-${process.pid}`);
  const raw = path.join(fixture, 'raw.png');
  fs.mkdirSync(fixture, { recursive: true });
  fs.writeFileSync(raw, Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M/wHwAF/gL+9y5nNwAAAABJRU5ErkJggg==', 'base64'));
  const commit = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim();
  try {
    assert.throws(() => execFileSync(process.execPath, ['scripts/capture.mjs', '--id=surface.admin', '--kind=built', '--png=tools/design-reference/test/' + path.basename(fixture) + '/raw.png', '--commit=' + commit, '--artifact-manifest=tools/design-reference/test/' + path.basename(fixture) + '/missing.json', '--artifact=tools/design-reference/test/' + path.basename(fixture) + '/artifact.exe'], { cwd: path.join(root, 'tools', 'design-reference'), stdio: 'pipe' }));
    assert.equal(fs.existsSync(`${raw}.receipt.json`), false);
  } finally {
    fs.rmSync(fixture, { recursive: true, force: true });
  }
});

test('serves pinned local Google Sans faces and exposes a capture-readiness proof', () => {
  const mainSource = fs.readFileSync(new URL('../src/main.cjs', import.meta.url), 'utf8');
  const provenance = JSON.parse(fs.readFileSync(new URL('../fonts/GoogleSans-v14.000.provenance.json', import.meta.url), 'utf8'));
  assert.match(mainSource, /google-sans-v14\.000-opsz17-18\.ttf/);
  assert.match(mainSource, /font-variation-settings:'opsz' 18/);
  assert.match(mainSource, /font-variation-settings:'opsz' 17/);
  assert.match(mainSource, /__DESIGN_REFERENCE_CAPTURE_READY__/);
  assert.match(mainSource, /__DESIGN_REFERENCE_FONT_PROOF__/);
  assert.equal(provenance.release, 'v14.000');
  assert.equal(provenance.axes.opsz['Google Sans'], 18);
  assert.equal(provenance.axes.opsz['Google Sans Text'], 17);
  assert.match(provenance.fontSha256, /^[a-f0-9]{64}$/);
});

test('strict completion stays red while the 25 rows intentionally hold pending evidence', () => {
  const verdict = validateCompletion(inventory, { root });
  assert.equal(verdict.valid, false);
  assert.ok(verdict.errors.some((error) => error === 'sourceCommit must be a full 40-character commit for completion'));
  assert.ok(verdict.errors.some((error) => error === 'capturePolicy.evidenceStatus must be verified for completion'));
  assert.ok(verdict.errors.some((error) => error.includes('surface.admin.productionRouteStatus must be known for completion')));
  assert.ok(verdict.errors.some((error) => error.includes('surface.admin.evidence.referenceRaw is not verified')));
});

test('strict completion rejects a forged verified row without a receipt and artifact provenance', () => {
  const broken = structuredClone(inventory);
  broken.sourceCommit = 'a'.repeat(40);
  broken.capturePolicy.evidenceStatus = 'verified';
  const row = broken.contracts[0];
  row.productionRouteStatus = 'known';
  row.materialAudit.status = 'verified';
  row.materialAudit.review = 'reviewed by accessibility owner';
  for (const evidence of Object.values(row.evidence)) {
    evidence.status = 'verified';
    evidence.sha256 = 'a'.repeat(64);
  }
  const verdict = validateCompletion(broken, { root });
  assert.equal(verdict.valid, false);
  assert.ok(verdict.errors.some((error) => error.includes('surface.admin.evidence.referenceRaw verified path is missing')));
  assert.ok(verdict.errors.some((error) => error.includes('surface.admin.evidence.referenceRaw receipt is missing')));
});

test('strict completion makes local font availability a reference-evidence boundary', () => {
  const source = fs.readFileSync(new URL('../scripts/parity-guard.mjs', import.meta.url), 'utf8');
  assert.match(source, /requiredReferenceFonts/);
  assert.match(source, /document\.fonts proof/);
  assert.match(source, /required font is unavailable/);
  assert.match(source, /diff requires an immutable approval record/);
  assert.match(source, /artifact hash does not match evidence/);
  assert.match(source, /function rootFile/);
});
