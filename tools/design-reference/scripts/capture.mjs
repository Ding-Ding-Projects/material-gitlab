import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { existingFile } from './evidence-paths.mjs';

const require = createRequire(import.meta.url);
const { PNG } = require('pngjs');

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const inventory = JSON.parse(fs.readFileSync(path.join(ROOT, 'design', 'parity-inventory.json'), 'utf8'));
const args = Object.fromEntries(process.argv.slice(2).filter((arg) => arg.startsWith('--')).map((arg) => { const [key, ...rest] = arg.slice(2).split('='); return [key, rest.join('=') || true]; }));

function fail(message) { console.error(`design-reference-capture: ${message}`); process.exitCode = 1; }
function hash(file) { return crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex'); }
function hashJson(value) { return crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex'); }
function rowFor(id) { const row = inventory.contracts.find((candidate) => candidate.id === id); if (!row) throw new Error(`unknown inventory row ${id}`); return row; }
function currentCommit() { return execFileSync('git', ['rev-parse', 'HEAD'], { cwd: ROOT, encoding: 'utf8' }).trim(); }
function artifactFromManifest(manifestValue, artifactValue, sourceCommit) {
  const manifestPath = existingFile(ROOT, manifestValue, 'artifact manifest path');
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  if (manifest?.schemaVersion !== 1 || manifest.sourceCommit !== sourceCommit || !Array.isArray(manifest.artifacts)) throw new Error('artifact manifest must have schemaVersion 1, matching sourceCommit, and artifacts');
  const artifactPath = String(artifactValue || '');
  const entry = manifest.artifacts.find((candidate) => candidate?.path === artifactPath);
  if (!entry || !/^[a-f0-9]{64}$/.test(entry.sha256 || '')) throw new Error('artifact manifest must contain the requested artifact path and SHA-256');
  const file = existingFile(ROOT, artifactPath, 'artifact path');
  if (hash(file) !== entry.sha256) throw new Error(`artifact hash does not match manifest: ${artifactPath}`);
  return { path: artifactPath, sha256: entry.sha256, manifest: { path: manifestValue, sha256: hash(manifestPath) } };
}
function captureSession(value, sourceCommit, id, kind) {
  const file = existingFile(ROOT, value, 'capture session provenance');
  const session = JSON.parse(fs.readFileSync(file, 'utf8'));
  if (session?.schemaVersion !== 1 || session.sourceCommit !== sourceCommit || session.id !== id || session.kind !== kind || typeof session.target !== 'string' || !session.target) throw new Error('capture session provenance must bind schema, source commit, row, kind, and launched target');
  return { path: value, sha256: hash(file) };
}
function pngInfo(file) {
  const bytes = fs.readFileSync(file);
  const decoded = PNG.sync.read(bytes, { checkCRC: true });
  return { width: decoded.width, height: decoded.height, bytes: bytes.length };
}

const id = String(args.id || '');
const kind = String(args.kind || '');
if (!id || !['reference', 'built'].includes(kind)) { fail('usage requires --id=surface.id and --kind=reference|built'); }
else {
  try {
    const row = rowFor(id);
      const output = args.png ? existingFile(ROOT, String(args.png), 'raw PNG path') : null;
    if (!output) {
      console.log(JSON.stringify({ status: 'capture-required', id, kind, route: row[`${kind}Route`] || row.referenceRoute, tuple: row.tuple, transport: 'cheap Lowlevel headless route', next: 'Capture the real app with the approved hidden-desktop route, then rerun with --png=<raw PNG path>.' }, null, 2));
      process.exitCode = 2;
    } else if (!fs.existsSync(output)) fail(`raw capture does not exist: ${output}`);
    else {
      const sourceCommit = String(args.commit || '');
      if (!/^[0-9a-f]{40}$/.test(sourceCommit)) throw new Error('capture receipt requires a full 40-character source commit');
      if (sourceCommit !== currentCommit()) throw new Error(`capture source commit ${sourceCommit} does not match current HEAD`);
      if (!args['artifact-manifest'] || !args.artifact) throw new Error('capture receipt requires --artifact-manifest=<relative manifest> and --artifact=<relative rendered artifact>');
      const artifact = artifactFromManifest(String(args['artifact-manifest']), String(args.artifact), sourceCommit);
      if (!args['session-provenance']) throw new Error('capture receipt requires --session-provenance=<relative launched-target record>');
      const sessionProvenance = captureSession(String(args['session-provenance']), sourceCommit, id, kind);
      let fontProof = null;
      if (kind === 'reference') {
        if (!args['font-proof']) throw new Error('reference capture receipt requires --font-proof=<JSON from document.fonts checks>; fallback fonts cannot complete parity');
        fontProof = JSON.parse(String(args['font-proof']));
        if (fontProof?.transport !== 'cheap Lowlevel headless route' || !fontProof?.availability || typeof fontProof.availability !== 'object') throw new Error('reference font proof must record cheap Lowlevel document.fonts availability results');
      }
      const info = pngInfo(output);
      const expectedWidth = Math.round(row.tuple.viewport.width * row.tuple.scale);
      const expectedHeight = Math.round(row.tuple.viewport.height * row.tuple.scale);
      if (info.width !== expectedWidth || info.height !== expectedHeight) throw new Error(`capture dimensions ${info.width}x${info.height} do not match tuple ${expectedWidth}x${expectedHeight}`);
      const receipt = {
        schemaVersion: 2,
        id,
        kind,
        status: 'verified',
        referenceFile: row.referenceFile,
        referenceHash: hash(path.join(ROOT, row.referenceFile)),
        route: kind === 'reference' ? row.referenceRoute : row.productionRoute,
        tuple: row.tuple,
        tupleHash: hashJson(row.tuple),
        deterministic: row.deterministic,
        artifact,
        sessionProvenance,
        ...(fontProof ? { fontProof } : {}),
        raw: { path: path.relative(ROOT, output).replaceAll('\\', '/'), sha256: hash(output), ...info },
        sourceCommit,
        transport: 'cheap Lowlevel headless route',
        tool: 'tools/design-reference/scripts/capture.mjs',
        network: 'deny-external',
      };
      const receiptPath = `${output}.receipt.json`;
      fs.writeFileSync(receiptPath, `${JSON.stringify(receipt, null, 2)}\n`, 'utf8');
      console.log(`design-reference-capture: verified ${kind} capture for ${id}`);
      console.log(`receipt: ${path.relative(ROOT, receiptPath).replaceAll('\\', '/')}`);
    }
  } catch (error) { fail(error instanceof Error ? error.message : String(error)); }
}
