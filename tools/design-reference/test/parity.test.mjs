import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync, spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { runNegativeRegression, sha256, validateCompletion, validateInventory } from '../scripts/parity-guard.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const inventoryPath = path.join(root, 'design', 'parity-inventory.json');
const inventory = JSON.parse(fs.readFileSync(inventoryPath, 'utf8'));
const require = createRequire(import.meta.url);
const { PNG } = require('pngjs');

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

test('all capture routes follow the explicit production integration inventory', async () => {
  const source = fs.readFileSync(path.join(root, 'app/assets/javascripts/material_system/surfaces/contracts.js'), 'utf8');
  const { DESIGN_ROUTE_INTEGRATION_CONTRACTS: routes } = await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`);
  assert.equal(routes.length, 25);
  const representativeRoutes = {
    'surface.code': '/:namespace/:project/-/branches',
    'surface.repository': '/:namespace/:project/-/tree/:ref',
    'surface.command-palette': '/dashboard/projects',
    'surface.regex-builder': '/dashboard/projects',
    'surface.shell-b': '/dashboard/projects',
    'surface.sidebar': '/dashboard/projects',
  };
  for (const route of routes) {
    const row = inventory.contracts.find(({ id }) => id === route.id);
    assert.ok(row, `Missing production capture row: ${route.id}`);
    assert.equal(row.productionRoute, representativeRoutes[row.id] || route.route, row.id);
    assert.equal(row.productionRouteEvidence, 'source-registration-only', row.id);
    assert.equal(row.productionRouteStatus, 'known', row.id);
    assert.doesNotMatch(row.productionRoute, /design-reference|command-palette|regex-builder|shell-[ab]/);
    if (route.host && !['surface.command-palette', 'surface.regex-builder'].includes(row.id)) assert.equal(row.productionMount, route.host, row.id);
  }
  for (const slug of ['shell-a', 'shell-b', 'command-palette', 'regex-builder', 'sidebar']) {
    const row = inventory.contracts.find(({ id }) => id === `surface.${slug}`);
    assert.deepEqual(row.productionActions[0], { type: 'preference', key: 'shellVariant', value: slug === 'shell-a' ? 'a' : 'b', via: slug === 'shell-a' ? 'header-full' : 'header-minimal' });
  }
  for (const [slug, name] of [['command-palette', 'Open command palette (Ctrl+Shift+F)'], ['regex-builder', 'Open regex builder for search']]) {
    assert.equal(inventory.contracts.find(({ id }) => id === `surface.${slug}`).productionActions[1].accessibleName, name);
  }
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

test('built capture plans use the reviewed production route, never the reference route', () => {
  const source = fs.readFileSync(new URL('../scripts/capture.mjs', import.meta.url), 'utf8');
  assert.match(source, /kind === 'built' \? row\.productionRoute : row\.referenceRoute/);
  const plan = spawnSync(process.execPath, ['scripts/capture.mjs', '--id=surface.issues', '--kind=built'], { cwd: path.join(root, 'tools', 'design-reference'), encoding: 'utf8' });
  assert.equal(plan.status, 2);
  const payload = JSON.parse(plan.stdout);
  assert.equal(payload.route, inventory.contracts.find((row) => row.id === 'surface.issues').productionRoute);
  assert.notEqual(payload.route, inventory.contracts.find((row) => row.id === 'surface.issues').referenceRoute);
});

test('a valid manifest fixture turns a wrong-size capture red without writing a receipt', () => {
  const fixture = path.join(root, 'tools', 'design-reference', 'test', `.tmp-rejected-capture-${process.pid}`);
  const raw = path.join(fixture, 'raw.png');
  const wrong = path.join(fixture, 'wrong.png');
  const artifact = path.join(fixture, 'artifact.bin');
  const manifest = path.join(fixture, 'manifest.json');
  const session = path.join(fixture, 'session.json');
  fs.mkdirSync(fixture, { recursive: true });
  const pngImage = (width, height) => PNG.sync.write(new PNG({ width, height }));
  fs.writeFileSync(raw, pngImage(1280, 800));
  fs.writeFileSync(wrong, pngImage(1, 1));
  fs.writeFileSync(artifact, 'artifact');
  const commit = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim();
  const relative = (file) => path.relative(root, file).replaceAll('\\', '/');
  const artifactHash = crypto.createHash('sha256').update(fs.readFileSync(artifact)).digest('hex');
  fs.writeFileSync(manifest, JSON.stringify({ schemaVersion: 1, sourceCommit: commit, artifacts: [{ path: relative(artifact), sha256: artifactHash }] }));
  fs.writeFileSync(session, JSON.stringify({ schemaVersion: 1, sourceCommit: commit, id: 'surface.admin', kind: 'built', target: 'fixture://built' }));
  try {
    const args = ['scripts/capture.mjs', '--id=surface.admin', '--kind=built', '--commit=' + commit, '--artifact-manifest=' + relative(manifest), '--artifact=' + relative(artifact), '--session-provenance=' + relative(session)];
    execFileSync(process.execPath, [...args, '--png=' + relative(raw)], { cwd: path.join(root, 'tools', 'design-reference'), stdio: 'pipe' });
    assert.equal(fs.existsSync(`${raw}.receipt.json`), true);
    assert.throws(() => execFileSync(process.execPath, [...args, '--png=' + relative(wrong)], { cwd: path.join(root, 'tools', 'design-reference'), stdio: 'pipe' }));
    assert.equal(fs.existsSync(`${wrong}.receipt.json`), false);
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
  assert.ok(verdict.errors.some((error) => error.includes('surface.admin.materialAudit must be verified for completion')));
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
  assert.ok(verdict.errors.some((error) => error.includes('surface.admin.evidence.referenceRaw evidence path escapes root')));
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

test('strict completion accepts a complete 25-row fixture and rejects every provenance boundary', () => {
  const fixture = path.join(root, 'tools', 'design-reference', 'test', `.tmp-complete-parity-${process.pid}`);
  const fixtureDesign = path.join(fixture, 'design');
  const commit = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim();
  const rel = (file) => path.relative(fixture, file).replaceAll('\\', '/');
  const jsonHash = (value) => crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex');
  const png = (width, height) => PNG.sync.write(new PNG({ width, height }));
  fs.mkdirSync(fixture, { recursive: true }); fs.cpSync(path.join(root, 'design'), fixtureDesign, { recursive: true });
  const complete = structuredClone(inventory);
  complete.sourceCommit = commit; complete.capturePolicy.evidenceStatus = 'verified';
  try {
    for (const row of complete.contracts) {
      row.productionRouteStatus = 'known'; row.materialAudit.status = 'verified'; row.materialAudit.review = 'fixture audit approval';
      const base = path.join(fixture, 'evidence', row.id); fs.mkdirSync(base, { recursive: true });
      const artifact = path.join(base, 'artifact.bin'); fs.writeFileSync(artifact, row.id);
      const artifactHash = sha256(artifact); const manifest = path.join(base, 'manifest.json');
      fs.writeFileSync(manifest, JSON.stringify({ schemaVersion: 1, sourceCommit: commit, artifacts: [{ path: rel(artifact), sha256: artifactHash }] }));
      const manifestHash = sha256(manifest);
      const tupleHash = jsonHash(row.tuple);
      const rawReceipts = {};
      for (const kind of ['reference', 'built']) {
        const raw = path.join(base, `${kind}.png`); fs.writeFileSync(raw, png(row.tuple.viewport.width * row.tuple.scale, row.tuple.viewport.height * row.tuple.scale));
        const session = path.join(base, `${kind}.session.json`);
        const sessionRecord = { schemaVersion: 1, sourceCommit: commit, id: row.id, kind, target: `fixture://${row.id}/${kind}` };
        fs.writeFileSync(session, JSON.stringify(sessionRecord));
        const receipt = { schemaVersion: 2, id: row.id, kind, status: 'verified', referenceFile: row.referenceFile, referenceHash: sha256(path.join(fixture, row.referenceFile)), route: kind === 'reference' ? row.referenceRoute : row.productionRoute, tuple: row.tuple, tupleHash, artifact: { path: rel(artifact), sha256: artifactHash, manifest: { path: rel(manifest), sha256: manifestHash } }, sessionProvenance: { path: rel(session), sha256: sha256(session) }, raw: { path: rel(raw), sha256: sha256(raw), width: row.tuple.viewport.width * row.tuple.scale, height: row.tuple.viewport.height * row.tuple.scale, bytes: fs.statSync(raw).size }, sourceCommit: commit, ...(kind === 'reference' ? { fontProof: { transport: 'cheap Lowlevel headless route', availability: { 'Google Sans': true, 'Google Sans Text': true, 'Material Symbols Outlined': true } } } : {}) };
        const receiptPath = `${raw}.receipt.json`; fs.writeFileSync(receiptPath, JSON.stringify(receipt)); rawReceipts[kind] = { raw, receiptPath, receipt };
        row.evidence[kind === 'reference' ? 'referenceRaw' : 'builtRaw'] = { path: rel(raw), sha256: sha256(raw), status: 'verified', reason: 'fixture' };
      }
      const inputs = { reference: { path: row.evidence.referenceRaw.path, sha256: row.evidence.referenceRaw.sha256 }, built: { path: row.evidence.builtRaw.path, sha256: row.evidence.builtRaw.sha256 } };
      const inputReceipts = { reference: { path: rel(rawReceipts.reference.receiptPath), sha256: sha256(rawReceipts.reference.receiptPath) }, built: { path: rel(rawReceipts.built.receiptPath), sha256: sha256(rawReceipts.built.receiptPath) } };
      const side = path.join(base, 'side.svg'); fs.writeFileSync(side, '<svg/>');
      const sideReceipt = { schemaVersion: 2, id: row.id, kind: 'side-by-side', status: 'verified', sourceCommit: commit, tuple: row.tuple, tupleHash, artifact: { sha256: sha256(side) }, inputs, inputReceipts };
      fs.writeFileSync(`${side}.receipt.json`, JSON.stringify(sideReceipt)); row.evidence.sideBySide = { path: rel(side), sha256: sha256(side), status: 'verified', reason: 'fixture' };
      const diff = path.join(base, 'diff.json'); const diffRecord = { schemaVersion: 2, id: row.id, status: 'unreviewed', sourceCommit: commit, tuple: row.tuple, tupleHash, inputs, review: { verdict: 'pending' } }; fs.writeFileSync(diff, JSON.stringify(diffRecord));
      const diffReceipt = { schemaVersion: 2, id: row.id, kind: 'diff', status: 'verified', sourceCommit: commit, tuple: row.tuple, tupleHash, artifact: { sha256: sha256(diff) }, inputs, inputReceipts }; fs.writeFileSync(`${diff}.receipt.json`, JSON.stringify(diffReceipt));
      fs.writeFileSync(`${diff}.review.json`, JSON.stringify({ schemaVersion: 1, id: row.id, status: 'approved', diff: { path: rel(diff), sha256: sha256(diff) }, sourceCommit: commit, tupleHash, reviewer: 'fixture reviewer', approval: 'fixture approval' }));
      row.evidence.diff = { path: rel(diff), sha256: sha256(diff), status: 'verified', reason: 'fixture' };
    }
    assert.equal(validateCompletion(complete, { root: fixture }).valid, true, validateCompletion(complete, { root: fixture }).errors.join('\n'));
    const red = (name, mutate) => { const broken = structuredClone(complete); mutate(broken); const verdict = validateCompletion(broken, { root: fixture }); assert.equal(verdict.valid, false, `${name} stayed green`); assert.equal(validateCompletion(complete, { root: fixture }).valid, true, `${name} did not restore green`); };
    red('route', (value) => { value.contracts[0].evidence.referenceRaw.path = value.contracts[0].evidence.builtRaw.path; });
    red('kind', (value) => { value.contracts[0].evidence.referenceRaw.path = value.contracts[0].evidence.builtRaw.path; value.contracts[0].evidence.referenceRaw.sha256 = value.contracts[0].evidence.builtRaw.sha256; });
    red('commit', (value) => { value.sourceCommit = '0'.repeat(40); });
    red('tuple', (value) => { value.contracts[0].tuple.theme = 'dark'; });
    red('hash', (value) => { value.contracts[0].evidence.referenceRaw.sha256 = '0'.repeat(64); });
    red('status', (value) => { value.contracts[0].evidence.referenceRaw.status = 'pending'; value.contracts[0].evidence.referenceRaw.sha256 = null; });
    const raw = path.join(fixture, complete.contracts[0].evidence.referenceRaw.path); const rawOriginal = fs.readFileSync(raw); fs.writeFileSync(raw, rawOriginal.subarray(0, 24));
    assert.equal(validateCompletion(complete, { root: fixture }).valid, false, 'truncated PNG stayed green'); fs.writeFileSync(raw, rawOriginal);
    assert.equal(validateCompletion(complete, { root: fixture }).valid, true, 'restored PNG should turn green');
    const review = path.join(fixture, `${complete.contracts[0].evidence.diff.path}.review.json`); const reviewOriginal = fs.readFileSync(review, 'utf8');
    fs.writeFileSync(review, '{'); assert.equal(validateCompletion(complete, { root: fixture }).valid, false, 'malformed review fixture should turn red'); fs.writeFileSync(review, reviewOriginal);
    assert.equal(validateCompletion(complete, { root: fixture }).valid, true, 'restored review fixture should turn green');
    const rawReceipt = path.join(fixture, `${complete.contracts[0].evidence.referenceRaw.path}.receipt.json`); const rawReceiptOriginal = fs.readFileSync(rawReceipt, 'utf8');
    const outside = path.join(path.dirname(fixture), `.tmp-parity-outside-${process.pid}`); const escape = path.join(fixture, 'escape'); fs.mkdirSync(outside); fs.writeFileSync(path.join(outside, 'manifest.json'), fs.readFileSync(path.join(fixture, 'evidence', complete.contracts[0].id, 'manifest.json')));
    try {
      fs.symlinkSync(outside, escape, 'junction');
      const escaped = JSON.parse(rawReceiptOriginal); escaped.artifact.manifest.path = 'escape/manifest.json'; escaped.artifact.manifest.sha256 = sha256(path.join(outside, 'manifest.json')); fs.writeFileSync(rawReceipt, JSON.stringify(escaped));
      assert.equal(validateCompletion(complete, { root: fixture }).valid, false, 'symlink escape stayed green'); fs.writeFileSync(rawReceipt, rawReceiptOriginal);
      assert.equal(validateCompletion(complete, { root: fixture }).valid, true, 'restored symlink receipt should turn green');
    } finally { fs.rmSync(escape, { recursive: true, force: true }); fs.rmSync(outside, { recursive: true, force: true }); }
  } finally { fs.rmSync(fixture, { recursive: true, force: true }); }
});
