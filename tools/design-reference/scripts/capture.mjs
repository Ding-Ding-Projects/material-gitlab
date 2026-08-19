import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const inventory = JSON.parse(fs.readFileSync(path.join(ROOT, 'design', 'parity-inventory.json'), 'utf8'));
const args = Object.fromEntries(process.argv.slice(2).filter((arg) => arg.startsWith('--')).map((arg) => { const [key, ...rest] = arg.slice(2).split('='); return [key, rest.join('=') || true]; }));

function fail(message) { console.error(`design-reference-capture: ${message}`); process.exitCode = 1; }
function hash(file) { return crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex'); }
function rowFor(id) { const row = inventory.contracts.find((candidate) => candidate.id === id); if (!row) throw new Error(`unknown inventory row ${id}`); return row; }
function currentCommit() { return execFileSync('git', ['rev-parse', 'HEAD'], { cwd: ROOT, encoding: 'utf8' }).trim(); }
function pngInfo(file) {
  const bytes = fs.readFileSync(file);
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  if (bytes.length < 24 || !bytes.subarray(0, 8).equals(signature) || bytes.toString('ascii', 12, 16) !== 'IHDR') throw new Error('output is not a valid PNG');
  return { width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20), bytes: bytes.length };
}

const id = String(args.id || '');
const kind = String(args.kind || '');
if (!id || !['reference', 'built'].includes(kind)) { fail('usage requires --id=surface.id and --kind=reference|built'); }
else {
  try {
    const row = rowFor(id);
    const output = args.png ? path.resolve(ROOT, String(args.png)) : null;
    if (!output) {
      console.log(JSON.stringify({ status: 'capture-required', id, kind, route: row[`${kind}Route`] || row.referenceRoute, tuple: row.tuple, transport: 'cheap Lowlevel headless route', next: 'Capture the real app with the approved hidden-desktop route, then rerun with --png=<raw PNG path>.' }, null, 2));
      process.exitCode = 2;
    } else if (!fs.existsSync(output)) fail(`raw capture does not exist: ${output}`);
    else {
      const sourceCommit = String(args.commit || '');
      if (!/^[0-9a-f]{40}$/.test(sourceCommit)) throw new Error('capture receipt requires a full 40-character source commit');
      if (sourceCommit !== currentCommit()) throw new Error(`capture source commit ${sourceCommit} does not match current HEAD`);
      const info = pngInfo(output);
      const expectedWidth = Math.round(row.tuple.viewport.width * row.tuple.scale);
      const expectedHeight = Math.round(row.tuple.viewport.height * row.tuple.scale);
      if (info.width !== expectedWidth || info.height !== expectedHeight) fail(`capture dimensions ${info.width}x${info.height} do not match tuple ${expectedWidth}x${expectedHeight}`);
      const receipt = {
        schemaVersion: 1,
        id,
        kind,
        status: 'verified',
        referenceFile: row.referenceFile,
        referenceHash: hash(path.join(ROOT, row.referenceFile)),
        route: row.referenceRoute,
        tuple: row.tuple,
        deterministic: row.deterministic,
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
