import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { existingFile, outputFile } from './evidence-paths.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const args = Object.fromEntries(process.argv.slice(2).filter((arg) => arg.startsWith('--')).map((arg) => { const [key, ...rest] = arg.slice(2).split('='); return [key, rest.join('=') || true]; }));
const fail = (message) => { console.error(`design-reference-side-by-side: ${message}`); process.exitCode = 1; };
const hash = (file) => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const hashJson = (value) => crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex');
const normalized = (file) => path.relative(ROOT, file).replaceAll('\\', '/');
function rawReceipt(receiptArg, input, kind, id, commit, tuple) {
  const receiptPath = existingFile(ROOT, String(receiptArg), 'raw receipt path');
  const receipt = JSON.parse(fs.readFileSync(receiptPath, 'utf8'));
  if (receipt.schemaVersion !== 2 || receipt.id !== id || receipt.kind !== kind || receipt.sourceCommit !== commit || receipt.raw?.path !== normalized(input) || receipt.raw?.sha256 !== hash(input) || JSON.stringify(receipt.tuple) !== JSON.stringify(tuple)) throw new Error(`raw receipt does not match ${kind} PNG, tuple, or source commit`);
  return { path: normalized(receiptPath), sha256: hash(receiptPath) };
}
const png = (file) => {
  const bytes = fs.readFileSync(file);
  if (bytes.length < 24 || bytes.readUInt32BE(0) !== 0x89504e47 || bytes.toString('ascii', 12, 16) !== 'IHDR') throw new Error(`not a PNG: ${file}`);
  return { width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20), bytes };
};
try {
  if (!args.id || !args.reference || !args.built || !args.output || !args.tuple || !args.commit || !args['reference-receipt'] || !args['built-receipt']) throw new Error('usage requires --id, --reference, --built, --output, --tuple, --commit, --reference-receipt, and --built-receipt');
  const referencePath = existingFile(ROOT, String(args.reference), 'reference raw PNG');
  const builtPath = existingFile(ROOT, String(args.built), 'built raw PNG');
  const output = outputFile(ROOT, String(args.output), 'side-by-side output');
  const reference = png(referencePath); const built = png(builtPath);
  if (reference.width !== built.width || reference.height !== built.height) throw new Error(`raw dimensions differ: reference ${reference.width}x${reference.height}, built ${built.width}x${built.height}`);
  const tuple = JSON.parse(String(args.tuple));
  if (!/^[0-9a-f]{40}$/.test(String(args.commit))) throw new Error('--commit must be a full 40-character source commit');
  const inputReceipts = { reference: rawReceipt(args['reference-receipt'], referencePath, 'reference', args.id, String(args.commit), tuple), built: rawReceipt(args['built-receipt'], builtPath, 'built', args.id, String(args.commit), tuple) };
  const esc = (value) => String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
  const width = reference.width * 2; const labelHeight = 64; const height = reference.height + labelHeight;
  const svg = `<?xml version="1.0" encoding="UTF-8"?>\n<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><title>Design parity comparison — ${esc(args.id)} — ${esc(tuple)}</title><rect width="${width}" height="${height}" fill="#141218"/><rect width="${reference.width}" height="${labelHeight}" fill="#6750a4"/><rect x="${reference.width}" width="${reference.width}" height="${labelHeight}" fill="#006a6a"/><text x="16" y="28" font-family="sans-serif" font-size="20" fill="white">REFERENCE</text><text x="16" y="50" font-family="monospace" font-size="11" fill="white">${esc(args.id)} · ${esc(tuple)}</text><text x="${reference.width + 16}" y="28" font-family="sans-serif" font-size="20" fill="white">BUILT APP</text><text x="${reference.width + 16}" y="50" font-family="monospace" font-size="11" fill="white">${esc(args.id)} · ${esc(tuple)}</text><image x="0" y="${labelHeight}" width="${reference.width}" height="${reference.height}" preserveAspectRatio="none" href="data:image/png;base64,${reference.bytes.toString('base64')}"/><image x="${reference.width}" y="${labelHeight}" width="${built.width}" height="${built.height}" preserveAspectRatio="none" href="data:image/png;base64,${built.bytes.toString('base64')}"/></svg>\n`;
  fs.mkdirSync(path.dirname(output), { recursive: true }); fs.writeFileSync(output, svg, 'utf8');
  const receipt = { schemaVersion: 2, id: args.id, kind: 'side-by-side', status: 'verified', sourceCommit: String(args.commit), tuple, tupleHash: hashJson(tuple), artifact: { sha256: hash(output) }, inputs: { reference: { path: normalized(referencePath), sha256: hash(referencePath) }, built: { path: normalized(builtPath), sha256: hash(builtPath) } }, inputReceipts, dimensions: { width, height }, tool: 'tools/design-reference/scripts/side-by-side.mjs' };
  fs.writeFileSync(`${output}.receipt.json`, `${JSON.stringify(receipt, null, 2)}\n`, 'utf8');
  console.log(JSON.stringify({ status: 'verified', id: args.id, output: path.relative(ROOT, output).replaceAll('\\', '/'), sha256: hash(output), inputs: receipt.inputs, dimensions: { width, height }, tuple }, null, 2));
} catch (error) { fail(error instanceof Error ? error.message : String(error)); }
