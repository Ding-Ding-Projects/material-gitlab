#!/usr/bin/env node
import { access, readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const siteRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const repositoryRoot = path.resolve(siteRoot, '..');
const inventoryPath = path.join(siteRoot, 'data', 'completeness-inventory.json');
const universalPath = path.join(siteRoot, 'data', 'universal-features.json');
const dimensions = ['implementation', 'documentation', 'localization', 'persistence', 'tests', 'capture', 'evidence'];

const canonicalIds = Object.freeze([
  'language-modes', 'funny-levels', 'emoji-toggle', 'school-mode', 'narration', 'scheduled-settings',
  'dim-sum-surprise', 'regex-builder', 'notifications', 'material-appearance', 'tabs-groups-search',
  'landing-and-offline-docs', 'command-palette', 'destructive-confirmation', 'local-history', 'changelog',
  'external-editor', 'exports', 'bulk-actions', 'accessibility-responsive', 'personal-vocabulary',
  'logo-customization', 'file-converter', 'ollama-manager', 'toy-locks', 'authenticator',
  'browser-download-surfaces', 'status-hub',
]);

const clone = (value) => JSON.parse(JSON.stringify(value));
const pathExists = async (relativePath) => {
  const clean = String(relativePath || '').split('#')[0].replaceAll('/', path.sep);
  try { await access(path.resolve(repositoryRoot, clean)); return true; } catch { return false; }
};

async function failures(inventory, universal) {
  const result = [];
  if (!inventory || inventory.schemaVersion !== 1 || inventory.generated !== false) result.push('inventory must be schemaVersion 1 and hand-written');
  if (!Array.isArray(inventory?.features)) return [...result, 'inventory features are required'];
  const ids = inventory.features.map((row) => row?.id);
  if (JSON.stringify(ids) !== JSON.stringify(canonicalIds)) result.push('inventory IDs must exactly match the canonical ordered list');
  const universalIds = universal?.features?.map((row) => row?.id) || [];
  if (JSON.stringify(universalIds) !== JSON.stringify(canonicalIds)) result.push('universal inventory IDs must exactly match the canonical ordered list');
  for (const [index, row] of inventory.features.entries()) {
    const prefix = `features[${index}]`;
    if (!row || typeof row !== 'object') { result.push(`${prefix} must be an object`); continue; }
    if (row.status !== 'implemented') result.push(`${prefix}.status must be implemented`);
    for (const dimension of dimensions) {
      const entry = row[dimension];
      if (!entry || typeof entry !== 'object') { result.push(`${prefix}.${dimension} is required`); continue; }
      if (!Array.isArray(entry.paths) || entry.paths.length === 0) { result.push(`${prefix}.${dimension}.paths must be non-empty`); continue; }
      if (typeof entry.assertion !== 'string' || entry.assertion.trim().length < 12) result.push(`${prefix}.${dimension}.assertion must be substantive`);
      for (const item of entry.paths) if (!await pathExists(item)) result.push(`${prefix}.${dimension}.paths missing: ${item}`);
    }
  }
  for (const [index, row] of (universal?.features || []).entries()) {
    if (row.status !== 'implemented') result.push(`universal.features[${index}].status must be implemented`);
    if (row.implementation?.status !== 'implemented') result.push(`universal.features[${index}].implementation must be implemented`);
    if (row.documentation?.status !== 'implemented') result.push(`universal.features[${index}].documentation must be implemented`);
    if (row.localization?.status !== 'implemented') result.push(`universal.features[${index}].localization must be implemented`);
    if (row.persistence?.status !== 'implemented') result.push(`universal.features[${index}].persistence must be implemented`);
    if (row.evidence?.status !== 'verified') result.push(`universal.features[${index}].evidence must be verified`);
  }
  return result;
}

function mutate(inventory, universal) {
  const cases = [];
  const removedId = clone(inventory); removedId.features.splice(0, 1); cases.push(['canonical ID removal', removedId, universal]);
  const planned = clone(inventory); planned.features[0].status = 'planned'; cases.push(['planned status', planned, universal]);
  const missingDimension = clone(inventory); delete missingDimension.features[0].implementation; cases.push(['dimension removal', missingDimension, universal]);
  const emptyAssertion = clone(inventory); emptyAssertion.features[0].tests.assertion = ''; cases.push(['empty assertion', emptyAssertion, universal]);
  const missingPath = clone(inventory); missingPath.features[0].documentation.paths = ['site/docs/does-not-exist.md']; cases.push(['missing file', missingPath, universal]);
  const unverified = clone(universal); unverified.features[0].evidence.status = 'unverified'; cases.push(['unverified evidence', inventory, unverified]);
  return cases;
}

const [inventory, universal] = await Promise.all([inventoryPath, universalPath].map(async (file) => JSON.parse(await readFile(file, 'utf8'))));
const negativeOnly = process.argv.includes('--negative-only');
if (!negativeOnly) {
  const baselineFailures = await failures(inventory, universal);
  if (baselineFailures.length) {
    console.error('Completeness gate failed:');
    baselineFailures.forEach((failure) => console.error(`- ${failure}`));
    process.exitCode = 1;
  }
}
let escaped = 0;
for (const [label, mutatedInventory, mutatedUniversal] of mutate(inventory, universal)) {
  if ((await failures(mutatedInventory, mutatedUniversal)).length === 0) { console.error(`Negative regression escaped: ${label}`); escaped += 1; }
}
if (escaped) process.exitCode = 1;
else if (!process.exitCode) console.log(`Completeness gate passed: ${canonicalIds.length} exact feature rows, ${dimensions.length} dimensions, 6 negative regressions rejected.`);
