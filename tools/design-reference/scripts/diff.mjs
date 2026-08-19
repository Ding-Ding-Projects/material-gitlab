import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const args = Object.fromEntries(process.argv.slice(2).filter((arg) => arg.startsWith('--')).map((arg) => { const [key, ...rest] = arg.slice(2).split('='); return [key, rest.join('=') || true]; }));
const fail = (message) => { console.error(`design-reference-diff: ${message}`); process.exitCode = 1; };
const hash = (file) => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
try {
  if (!args.id || !args.reference || !args.built || !args.output) throw new Error('usage requires --id, --reference, --built, and --output');
  const { PNG } = require('pngjs');
  const referencePath = path.resolve(ROOT, String(args.reference)); const builtPath = path.resolve(ROOT, String(args.built)); const output = path.resolve(ROOT, String(args.output));
  if (!fs.existsSync(referencePath) || !fs.existsSync(builtPath)) throw new Error('both raw PNG inputs must exist; no placeholder diff is created');
  const reference = PNG.sync.read(fs.readFileSync(referencePath)); const built = PNG.sync.read(fs.readFileSync(builtPath));
  if (reference.width !== built.width || reference.height !== built.height) throw new Error(`raw dimensions differ: reference ${reference.width}x${reference.height}, built ${built.width}x${built.height}`);
  const threshold = Math.max(0, Number(args.threshold || 0)); let changedPixels = 0; let totalDelta = 0; let maxDelta = 0;
  for (let offset = 0; offset < reference.data.length; offset += 4) {
    const delta = Math.abs(reference.data[offset] - built.data[offset]) + Math.abs(reference.data[offset + 1] - built.data[offset + 1]) + Math.abs(reference.data[offset + 2] - built.data[offset + 2]) + Math.abs(reference.data[offset + 3] - built.data[offset + 3]);
    totalDelta += delta; maxDelta = Math.max(maxDelta, delta); if (delta > threshold) changedPixels += 1;
  }
  const tuple = args.tuple ? JSON.parse(String(args.tuple)) : null;
  const record = { schemaVersion: 1, id: args.id, status: 'unreviewed', tuple, inputs: { reference: { path: path.relative(ROOT, referencePath).replaceAll('\\', '/'), sha256: hash(referencePath) }, built: { path: path.relative(ROOT, builtPath).replaceAll('\\', '/'), sha256: hash(builtPath) } }, dimensions: { width: reference.width, height: reference.height }, threshold, changedPixels, changedPixelRatio: changedPixels / (reference.width * reference.height), totalDelta, meanDelta: totalDelta / (reference.width * reference.height), maxDelta, comparison: 'RGBA absolute channel delta; metrics do not approve visual parity', tool: { name: 'tools/design-reference/scripts/diff.mjs', pngjs: require('pngjs/package.json').version }, review: { verdict: 'pending', reviewer: null, notes: null } };
  fs.mkdirSync(path.dirname(output), { recursive: true }); fs.writeFileSync(output, `${JSON.stringify(record, null, 2)}\n`, 'utf8');
  console.log(JSON.stringify({ ...record, output: path.relative(ROOT, output).replaceAll('\\', '/'), outputSha256: hash(output) }, null, 2));
} catch (error) { fail(error instanceof Error ? error.message : String(error)); }
