#!/usr/bin/env node
// Run the design-parity capture set against one already-launched CDP target.
//
// This wraps tools/design-reference/scripts/drive-capture.mjs and layout-probe.mjs so
// the 25 inventory rows, or the 70 layout-matrix tuples, are captured with one command
// per side instead of one command per row. It launches nothing itself: the caller starts
// the reference viewer (with --cdp-port) or the isolated browser (with
// --remote-debugging-port and --app pointed at --base-url) on the approved hidden
// desktop first, then hands this script the CDP endpoint.
//
//   Reference side, all 25 rows:
//     node scripts/design-parity/run-parity-captures.mjs --kind=reference \
//       --cdp=http://127.0.0.1:19333 --commit=<sha> [--ids=surface.issues,...] \
//       [--mint-receipt --artifact-manifest=<repo-relative> --artifact=<repo-relative>] [--probe]
//
//   Built side, all 25 rows (signs in once, on the first row; the profile cookie carries
//   the rest, because /users/sign_in redirects a signed-in user away from the form):
//     node scripts/design-parity/run-parity-captures.mjs --kind=built \
//       --cdp=http://127.0.0.1:9333 --commit=<sha> --base-url=http://localhost:8929 \
//       --fixture=<fixture.json> --sign-in-user=root --password-command="<cmd>" \
//       [--ids=...] [--mint-receipt --artifact-manifest=<repo-relative> --artifact=<repo-relative>] [--probe]
//
//   Layout matrix, built side, every tuple of every listed surface:
//     node scripts/design-parity/run-parity-captures.mjs --matrix --cdp=... --commit=<sha> \
//       --base-url=... --fixture=... [--sign-in-user=root --password-command="<cmd>"] [--ids=layout.issues.1280x800@1.dark,...]
//
//   Derive side-by-side and diff for every inventory row whose two raw captures exist:
//     node scripts/design-parity/run-parity-captures.mjs --derive --commit=<sha> [--ids=...]
//
//   Write the reference-side artifact manifest (the viewer entry file is the artifact):
//     node scripts/design-parity/run-parity-captures.mjs --write-reference-manifest --commit=<sha>
//
// Every row is attempted even when an earlier one fails; the exit status is non-zero when
// any row failed, and the per-row outcome is printed as a table and written to an
// ignored ledger under artifacts/parity/_local/. Nothing here fabricates a capture: a row
// with no PNG stays exactly as pending as it was.

import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const TOOLS = path.join(ROOT, 'tools', 'design-reference', 'scripts');
const INVENTORY = path.join(ROOT, 'design', 'parity-inventory.json');
const MATRIX = path.join(ROOT, 'design', 'layout-matrix.json');
const LEDGER_DIR = path.join(ROOT, 'artifacts', 'parity', '_local');

function parseArgs(argv) {
  const args = {};
  for (const token of argv) {
    if (!token.startsWith('--')) continue;
    const eq = token.indexOf('=');
    if (eq === -1) args[token.slice(2)] = true;
    else args[token.slice(2, eq)] = token.slice(eq + 1);
  }
  return args;
}

function fail(message) {
  console.error(`run-parity-captures: ${message}`);
  process.exit(1);
}

function sha256(file) {
  return crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
}

function rel(file) {
  return path.relative(ROOT, file).split(path.sep).join('/');
}

function runNode(script, scriptArgs) {
  const result = spawnSync(process.execPath, [script, ...scriptArgs], { cwd: ROOT, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  return { status: result.status, stdout: result.stdout || '', stderr: result.stderr || '' };
}

function passthrough(args, names) {
  const out = [];
  for (const name of names) if (args[name] !== undefined) out.push(args[name] === true ? `--${name}` : `--${name}=${args[name]}`);
  return out;
}

function selectIds(args, rows) {
  if (!args.ids) return rows;
  const wanted = new Set(String(args.ids).split(',').map((value) => value.trim()).filter(Boolean));
  const chosen = rows.filter((row) => wanted.has(row.id));
  const missing = [...wanted].filter((id) => !chosen.some((row) => row.id === id));
  if (missing.length) fail(`unknown ids: ${missing.join(', ')}`);
  return chosen;
}

function summarize(entries) {
  const width = Math.max(...entries.map((entry) => entry.id.length), 4);
  console.log(`\n${'id'.padEnd(width)}  outcome    detail`);
  for (const entry of entries) console.log(`${entry.id.padEnd(width)}  ${entry.outcome.padEnd(9)}  ${entry.detail}`);
  const failed = entries.filter((entry) => entry.outcome !== 'captured' && entry.outcome !== 'derived');
  console.log(`\n${entries.length - failed.length} succeeded, ${failed.length} failed`);
  return failed.length;
}

function writeLedger(name, payload) {
  fs.mkdirSync(LEDGER_DIR, { recursive: true });
  const file = path.join(LEDGER_DIR, `${name}-${new Date().toISOString().replace(/[:.]/g, '-')}.json`);
  fs.writeFileSync(file, `${JSON.stringify(payload, null, 2)}\n`);
  console.log(`ledger: ${rel(file)}`);
}

function tail(text, lines = 6) {
  return text.trim().split(/\r?\n/).slice(-lines).join(' | ');
}

const args = parseArgs(process.argv.slice(2));
const commit = args.commit;
if (!/^[a-f0-9]{40}$/.test(commit || '')) fail('--commit must be a 40-character commit sha');

if (args['write-reference-manifest']) {
  const entry = path.join(ROOT, 'tools', 'design-reference', 'src', 'main.cjs');
  const manifestPath = path.join(ROOT, 'artifacts', 'parity', 'reference-artifact-manifest.json');
  fs.mkdirSync(path.dirname(manifestPath), { recursive: true });
  const manifest = { schemaVersion: 1, sourceCommit: commit, artifacts: [{ path: rel(entry), sha256: sha256(entry) }] };
  fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
  console.log(JSON.stringify({ manifest: rel(manifestPath), artifact: rel(entry), sha256: manifest.artifacts[0].sha256 }));
  process.exit(0);
}

const inventory = JSON.parse(fs.readFileSync(INVENTORY, 'utf8'));

if (args.derive) {
  const rows = selectIds(args, inventory.contracts);
  const entries = [];
  for (const row of rows) {
    const dir = path.join(ROOT, 'artifacts', 'parity', row.id);
    const reference = path.join(dir, 'reference.png');
    const built = path.join(dir, 'built.png');
    const referenceReceipt = `${reference}.receipt.json`;
    const builtReceipt = `${built}.receipt.json`;
    if (![reference, built, referenceReceipt, builtReceipt].every((file) => fs.existsSync(file))) {
      entries.push({ id: row.id, outcome: 'skipped', detail: 'both raw captures with receipts are required first' });
      continue;
    }
    const tuple = JSON.stringify(row.tuple);
    const common = [`--id=${row.id}`, `--reference=${rel(reference)}`, `--built=${rel(built)}`, `--reference-receipt=${rel(referenceReceipt)}`, `--built-receipt=${rel(builtReceipt)}`, `--tuple=${tuple}`, `--commit=${commit}`];
    const side = runNode(path.join(TOOLS, 'side-by-side.mjs'), [...common, `--output=${rel(path.join(dir, 'side-by-side.svg'))}`]);
    if (side.status !== 0) { entries.push({ id: row.id, outcome: 'failed', detail: `side-by-side: ${tail(side.stderr || side.stdout)}` }); continue; }
    const diff = runNode(path.join(TOOLS, 'diff.mjs'), [...common, `--output=${rel(path.join(dir, 'diff.json'))}`]);
    if (diff.status !== 0) { entries.push({ id: row.id, outcome: 'failed', detail: `diff: ${tail(diff.stderr || diff.stdout)}` }); continue; }
    let metrics = '';
    try {
      const record = JSON.parse(fs.readFileSync(path.join(dir, 'diff.json'), 'utf8'));
      const m = record.metrics || record;
      metrics = `changedPixelRatio=${m.changedPixelRatio ?? '?'} meanDelta=${m.meanDelta ?? '?'}`;
    } catch { metrics = 'diff written'; }
    entries.push({ id: row.id, outcome: 'derived', detail: metrics });
  }
  writeLedger('derive', { commit, entries });
  process.exit(summarize(entries) ? 1 : 0);
}

const kind = args.matrix ? 'built' : args.kind;
if (kind !== 'reference' && kind !== 'built') fail('--kind must be reference or built, or pass --matrix / --derive');
if (!args.cdp) fail('--cdp=<http endpoint> is required');
if (kind === 'built' && !args['base-url']) fail('--base-url is required for built captures');

const captureArgs = passthrough(args, ['cdp', 'base-url', 'fixture', 'mint-receipt', 'artifact-manifest', 'artifact']);
const signInArgs = passthrough(args, ['sign-in-user', 'password-file', 'password-command']);
let signedIn = false;
const entries = [];

function captureRow({ id, surfaceId, outDir, tupleOverrides }) {
  const driverArgs = [`--id=${surfaceId}`, `--kind=${kind}`, `--commit=${commit}`, `--out-dir=${rel(outDir)}`, ...captureArgs, ...tupleOverrides];
  if (kind === 'built' && signInArgs.length && !signedIn) driverArgs.push(...signInArgs);
  const drive = runNode(path.join(TOOLS, 'drive-capture.mjs'), driverArgs);
  if (drive.status !== 0) return { id, outcome: 'failed', detail: `drive-capture: ${tail(drive.stderr || drive.stdout)}` };
  if (kind === 'built') signedIn = true;
  const png = path.join(outDir, `${kind}.png`);
  if (!fs.existsSync(png)) return { id, outcome: 'failed', detail: 'driver exited 0 but wrote no PNG' };
  let detail = `${path.basename(png)} ${sha256(png).slice(0, 12)}`;
  if (args.probe || args.matrix) {
    const probe = runNode(path.join(TOOLS, 'layout-probe.mjs'), [`--cdp=${args.cdp}`, `--id=${surfaceId}`, `--kind=${kind}`, `--commit=${commit}`, `--out-dir=${rel(outDir)}`]);
    if (probe.status !== 0) return { id, outcome: 'failed', detail: `${detail}; layout-probe: ${tail(probe.stderr || probe.stdout)}` };
    try {
      const record = JSON.parse(fs.readFileSync(path.join(outDir, 'layout-probe.json'), 'utf8'));
      detail += `; probe findings=${record.summary?.findings ?? record.findings?.length ?? '?'}`;
    } catch { detail += '; probe written'; }
  }
  return { id, outcome: 'captured', detail };
}

if (args.matrix) {
  const matrix = JSON.parse(fs.readFileSync(MATRIX, 'utf8'));
  const rows = selectIds(args, matrix.rows);
  for (const row of rows) {
    const outDir = path.join(ROOT, path.dirname(row.evidence.builtRaw.path));
    const t = row.tuple;
    entries.push(captureRow({ id: row.id, surfaceId: row.surfaceId, outDir, tupleOverrides: [`--theme=${t.theme}`, `--scale=${t.scale}`, `--width=${t.width}`, `--height=${t.height}`] }));
    console.log(`${entries.at(-1).outcome}: ${row.id} ${entries.at(-1).detail}`);
  }
  writeLedger('matrix', { commit, entries });
  process.exit(summarize(entries) ? 1 : 0);
}

const rows = selectIds(args, inventory.contracts);
for (const row of rows) {
  const outDir = path.join(ROOT, 'artifacts', 'parity', row.id);
  entries.push(captureRow({ id: row.id, surfaceId: row.id, outDir, tupleOverrides: [] }));
  console.log(`${entries.at(-1).outcome}: ${row.id} ${entries.at(-1).detail}`);
}
writeLedger(kind, { commit, entries });
process.exit(summarize(entries) ? 1 : 0);
