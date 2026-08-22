import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const args = Object.fromEntries(process.argv.slice(2).filter((arg) => arg.startsWith('--')).map((arg) => { const [key, ...rest] = arg.slice(2).split('='); return [key, rest.join('=') || true]; }));
const fail = (message) => { console.error(`design-reference-side-by-side: ${message}`); process.exitCode = 1; };
const hash = (file) => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const png = (file) => {
  const bytes = fs.readFileSync(file);
  if (bytes.length < 24 || bytes.readUInt32BE(0) !== 0x89504e47 || bytes.toString('ascii', 12, 16) !== 'IHDR') throw new Error(`not a PNG: ${file}`);
  return { width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20), bytes };
};
try {
  if (!args.id || !args.reference || !args.built || !args.output) throw new Error('usage requires --id, --reference, --built, and --output');
  const referencePath = path.resolve(ROOT, String(args.reference));
  const builtPath = path.resolve(ROOT, String(args.built));
  const output = path.resolve(ROOT, String(args.output));
  if (!fs.existsSync(referencePath) || !fs.existsSync(builtPath)) throw new Error('both raw PNG inputs must exist; no placeholder output is created');
  const reference = png(referencePath); const built = png(builtPath);
  if (reference.width !== built.width || reference.height !== built.height) throw new Error(`raw dimensions differ: reference ${reference.width}x${reference.height}, built ${built.width}x${built.height}`);
  const tuple = String(args.tuple || 'not supplied; see inventory row');
  const esc = (value) => String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
  const width = reference.width * 2; const labelHeight = 64; const height = reference.height + labelHeight;
  const svg = `<?xml version="1.0" encoding="UTF-8"?>\n<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><title>Design parity comparison — ${esc(args.id)} — ${esc(tuple)}</title><rect width="${width}" height="${height}" fill="#141218"/><rect width="${reference.width}" height="${labelHeight}" fill="#6750a4"/><rect x="${reference.width}" width="${reference.width}" height="${labelHeight}" fill="#006a6a"/><text x="16" y="28" font-family="sans-serif" font-size="20" fill="white">REFERENCE</text><text x="16" y="50" font-family="monospace" font-size="11" fill="white">${esc(args.id)} · ${esc(tuple)}</text><text x="${reference.width + 16}" y="28" font-family="sans-serif" font-size="20" fill="white">BUILT APP</text><text x="${reference.width + 16}" y="50" font-family="monospace" font-size="11" fill="white">${esc(args.id)} · ${esc(tuple)}</text><image x="0" y="${labelHeight}" width="${reference.width}" height="${reference.height}" preserveAspectRatio="none" href="data:image/png;base64,${reference.bytes.toString('base64')}"/><image x="${reference.width}" y="${labelHeight}" width="${built.width}" height="${built.height}" preserveAspectRatio="none" href="data:image/png;base64,${built.bytes.toString('base64')}"/></svg>\n`;
  fs.mkdirSync(path.dirname(output), { recursive: true }); fs.writeFileSync(output, svg, 'utf8');
  console.log(JSON.stringify({ status: 'verified', id: args.id, output: path.relative(ROOT, output).replaceAll('\\', '/'), sha256: hash(output), inputs: { reference: hash(referencePath), built: hash(builtPath) }, dimensions: { width, height }, tuple }, null, 2));
} catch (error) { fail(error instanceof Error ? error.message : String(error)); }
