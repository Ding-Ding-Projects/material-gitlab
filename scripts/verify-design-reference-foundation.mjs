import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const root = process.cwd();
const registryPath = path.join(root, 'design', 'reference-registry.json');
const registry = JSON.parse(fs.readFileSync(registryPath, 'utf8'));
const expectedArchive = {
  expectedEntries: 29,
  expectedDcHtmlFiles: 25,
  sha256: '12E426D2A64CF05C8419B3D76825EF2A6B51C17B6526DD737112B6E9A5F4ADB1',
};

const fail = (message) => {
  console.error(`design-reference-foundation: ${message}`);
  process.exitCode = 1;
};

if (registry.schemaVersion !== 1) fail('schemaVersion must be exactly 1');
if (registry.sourceArchive?.sha256 !== expectedArchive.sha256) fail('source archive SHA-256 drifted');
for (const key of ['expectedEntries', 'expectedDcHtmlFiles']) {
  if (registry.sourceArchive?.[key] !== expectedArchive[key]) fail(`source archive ${key} drifted`);
}

const contracts = Array.isArray(registry.contracts) ? registry.contracts : [];
if (contracts.length !== 25) fail(`expected exactly 25 contracts, found ${contracts.length}`);
const ids = new Set();
const references = new Set();
for (const [index, contract] of contracts.entries()) {
  const label = `contracts[${index}]`;
  for (const key of ['id', 'title', 'reference', 'route']) {
    if (typeof contract?.[key] !== 'string' || contract[key].trim() === '') fail(`${label}.${key} is required`);
  }
  if (ids.has(contract.id)) fail(`${label}.id is duplicated: ${contract.id}`);
  if (references.has(contract.reference)) fail(`${label}.reference is duplicated: ${contract.reference}`);
  ids.add(contract.id);
  references.add(contract.reference);
  const absoluteReference = path.join(root, contract.reference);
  if (!fs.existsSync(absoluteReference)) fail(`${label}.reference is missing: ${contract.reference}`);
  if (!contract.reference.toLowerCase().endsWith('.dc.html')) fail(`${label}.reference is not a .dc.html file`);
}

const actualReferences = fs.readdirSync(path.join(root, 'design'))
  .filter((name) => name.toLowerCase().endsWith('.dc.html'))
  .map((name) => `design/${name}`)
  .sort();
const registeredReferences = [...references].sort();
if (actualReferences.length !== 25) fail(`expected exactly 25 checked-in .dc.html files, found ${actualReferences.length}`);
if (JSON.stringify(actualReferences) !== JSON.stringify(registeredReferences)) fail('registry references do not exactly match checked-in .dc.html files');

if (process.exitCode) process.exit();
console.log(`design-reference-foundation: verified ${contracts.length} exact contracts and ${actualReferences.length} references`);
