import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const INVENTORY_PATH = path.join(ROOT, 'design', 'parity-inventory.json');
const EXPECTED_IDS = [
  'surface.admin', 'surface.agent-memory', 'surface.analyze', 'surface.build', 'surface.code',
  'surface.command-palette', 'surface.deploy', 'surface.epics', 'surface.issues', 'surface.login',
  'surface.manage', 'surface.merge-requests', 'surface.monitor', 'surface.operate', 'surface.pipelines',
  'surface.plan', 'surface.regex-builder', 'surface.repository', 'surface.secure', 'surface.security',
  'surface.settings', 'surface.shell-a', 'surface.shell-b', 'surface.sidebar', 'surface.todos',
];
const REQUIRED_PRIMITIVES = ['buttons', 'fields', 'menus', 'tabs', 'dialogs', 'navigation', 'selection', 'typography', 'color-roles', 'shape', 'elevation', 'state-layers', 'focus', 'motion', 'accessibility'];

export function sha256(file) {
  return crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
}

function issue(errors, message) { errors.push(message); }

function checkEvidence(errors, row, key, root) {
  const evidence = row.evidence?.[key];
  if (!evidence || typeof evidence !== 'object') return issue(errors, `${row.id}.evidence.${key} is required`);
  if (typeof evidence.path !== 'string' || evidence.path.trim() === '') issue(errors, `${row.id}.evidence.${key}.path is required`);
  if (!['pending', 'verified', 'blocked'].includes(evidence.status)) issue(errors, `${row.id}.evidence.${key}.status must be pending, verified, or blocked`);
  if (typeof evidence.reason !== 'string' || evidence.reason.trim() === '') issue(errors, `${row.id}.evidence.${key}.reason is required`);
  if (evidence.status === 'pending' && evidence.sha256 !== null) issue(errors, `${row.id}.evidence.${key} pending evidence must not claim a hash`);
  if (evidence.status === 'verified') {
    if (!/^[a-f0-9]{64}$/.test(evidence.sha256 || '')) issue(errors, `${row.id}.evidence.${key} verified evidence needs a SHA-256`);
    const file = path.join(root, evidence.path);
    if (!fs.existsSync(file)) issue(errors, `${row.id}.evidence.${key} verified path is missing: ${evidence.path}`);
    else if (sha256(file) !== evidence.sha256) issue(errors, `${row.id}.evidence.${key} hash is stale`);
  }
}

export function validateInventory(inventory, { root = ROOT, checkReferenceHashes = true } = {}) {
  const errors = [];
  if (inventory?.schemaVersion !== 2) issue(errors, 'schemaVersion must be exactly 2');
  if (!Array.isArray(inventory?.contracts)) return { valid: false, errors: ['contracts must be an array'] };
  if (inventory.contracts.length !== EXPECTED_IDS.length) issue(errors, `expected exactly ${EXPECTED_IDS.length} hand-written rows`);
  const rows = new Map();
  const references = new Set();
  for (const [index, row] of inventory.contracts.entries()) {
    const label = `contracts[${index}]`;
    if (!row || typeof row !== 'object') { issue(errors, `${label} must be an object`); continue; }
    for (const key of ['id', 'title', 'referenceFile', 'referenceHash', 'referenceRoute', 'productionRoute', 'productionRouteStatus', 'productionMount', 'state']) {
      if (typeof row[key] !== 'string' || row[key].trim() === '') issue(errors, `${label}.${key} is required`);
    }
    if (rows.has(row.id)) issue(errors, `${label}.id is duplicated: ${row.id}`);
    rows.set(row.id, row);
    if (references.has(row.referenceFile)) issue(errors, `${label}.referenceFile is duplicated: ${row.referenceFile}`);
    references.add(row.referenceFile);
    if (!EXPECTED_IDS.includes(row.id)) issue(errors, `${label}.id is not a declared stable contract: ${row.id}`);
    const referencePath = path.join(root, row.referenceFile || '');
    if (!fs.existsSync(referencePath)) issue(errors, `${label}.referenceFile is missing: ${row.referenceFile}`);
    if (!/^design\/[^/]+\.dc\.html$/.test(row.referenceFile || '')) issue(errors, `${label}.referenceFile must be a direct design/*.dc.html entry`);
    if (!/^\/design-reference\/[a-z0-9-]+$/.test(row.referenceRoute || '')) issue(errors, `${label}.referenceRoute must be a stable design-reference route`);
    if (!['known', 'placeholder'].includes(row.productionRouteStatus)) issue(errors, `${label}.productionRouteStatus must say known or placeholder`);
    if (typeof row.tuple !== 'object' || row.tuple === null) issue(errors, `${label}.tuple is required`);
    else {
      for (const key of ['screen', 'state', 'theme', 'locale']) if (typeof row.tuple[key] !== 'string' || row.tuple[key] === '') issue(errors, `${label}.tuple.${key} is required`);
      if (row.tuple.screen !== row.id) issue(errors, `${label}.tuple.screen must equal ${row.id}`);
      if (!['light', 'dark'].includes(row.tuple.theme)) issue(errors, `${label}.tuple.theme must be light or dark`);
      if (!Number.isFinite(row.tuple.scale) || row.tuple.scale <= 0) issue(errors, `${label}.tuple.scale must be positive`);
      if (!row.tuple.viewport || !Number.isInteger(row.tuple.viewport.width) || !Number.isInteger(row.tuple.viewport.height) || row.tuple.viewport.width <= 0 || row.tuple.viewport.height <= 0) issue(errors, `${label}.tuple.viewport must have positive integer width and height`);
    }
    if (typeof row.deterministic !== 'object' || row.deterministic === null) issue(errors, `${label}.deterministic is required`);
    else for (const key of ['fixture', 'time', 'randomSeed', 'motion', 'fonts', 'network']) if (row.deterministic[key] === undefined || row.deterministic[key] === null || row.deterministic[key] === '') issue(errors, `${label}.deterministic.${key} is required`);
    if (typeof row.materialAudit !== 'object' || row.materialAudit === null) issue(errors, `${label}.materialAudit is required`);
    else {
      if (!['pending', 'verified', 'blocked'].includes(row.materialAudit.status)) issue(errors, `${label}.materialAudit.status must be pending, verified, or blocked`);
      for (const primitive of REQUIRED_PRIMITIVES) if (!Array.isArray(row.materialAudit.primitives) || !row.materialAudit.primitives.includes(primitive)) issue(errors, `${label}.materialAudit.primitives is missing ${primitive}`);
    }
    for (const key of ['referenceRaw', 'builtRaw', 'sideBySide', 'diff']) checkEvidence(errors, row, key, root);
    if (!Array.isArray(row.intentionalDeviations)) issue(errors, `${label}.intentionalDeviations must be an array`);
    else row.intentionalDeviations.forEach((deviation, deviationIndex) => {
      if (!deviation || typeof deviation.reason !== 'string' || deviation.reason.trim() === '') issue(errors, `${label}.intentionalDeviations[${deviationIndex}].reason is required`);
      if (!deviation || typeof deviation.approval !== 'string' || deviation.approval.trim() === '') issue(errors, `${label}.intentionalDeviations[${deviationIndex}].approval is required`);
    });
    if (typeof row.captureProvenance !== 'object' || !row.captureProvenance.reference || !row.captureProvenance.built || !row.captureProvenance.diff) issue(errors, `${label}.captureProvenance must name reference, built, and diff tools`);
    if (!/^[a-f0-9]{64}$/.test(row.referenceHash || '')) issue(errors, `${label}.referenceHash must be a SHA-256`);
    else if (checkReferenceHashes && fs.existsSync(referencePath) && sha256(referencePath) !== row.referenceHash) issue(errors, `${label}.referenceHash is stale`);
  }
  if (JSON.stringify([...rows.keys()].sort()) !== JSON.stringify([...EXPECTED_IDS].sort())) issue(errors, 'inventory IDs must exactly match the hand-written 25-contract set');
  const actualReferences = fs.readdirSync(path.join(root, 'design')).filter((name) => name.endsWith('.dc.html')).map((name) => `design/${name}`).sort();
  if (JSON.stringify(actualReferences) !== JSON.stringify([...references].sort())) issue(errors, 'inventory references must exactly match all checked-in design/*.dc.html files');
  return { valid: errors.length === 0, errors };
}

function clone(value) { return JSON.parse(JSON.stringify(value)); }
function removeAt(object, pathParts) {
  let current = object;
  for (let index = 0; index < pathParts.length - 1; index += 1) current = current?.[pathParts[index]];
  if (current && Object.prototype.hasOwnProperty.call(current, pathParts.at(-1))) delete current[pathParts.at(-1)];
}

export function runNegativeRegression(inventory) {
  const boundaries = [
    ['referenceFile'], ['referenceRoute'], ['productionRoute'], ['productionMount'], ['state'],
    ['tuple', 'screen'], ['tuple', 'state'], ['tuple', 'theme'], ['tuple', 'viewport', 'width'], ['tuple', 'viewport', 'height'], ['tuple', 'scale'], ['tuple', 'locale'],
    ['deterministic', 'fixture'], ['deterministic', 'time'], ['deterministic', 'randomSeed'], ['deterministic', 'motion'], ['deterministic', 'fonts'], ['deterministic', 'network'],
    ['materialAudit'], ['materialAudit', 'primitives'], ['evidence', 'referenceRaw'], ['evidence', 'builtRaw'], ['evidence', 'sideBySide'], ['evidence', 'diff'],
  ];
  const failures = [];
  for (const row of inventory.contracts) for (const boundary of boundaries) {
    const broken = clone(inventory); const target = broken.contracts.find((candidate) => candidate.id === row.id); removeAt(target, boundary);
    const verdict = validateInventory(broken, { checkReferenceHashes: false });
    if (verdict.valid) failures.push(`${row.id}:${boundary.join('.')}`);
  }
  return { valid: failures.length === 0, failures, cases: inventory.contracts.length * boundaries.length };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const inventory = JSON.parse(fs.readFileSync(INVENTORY_PATH, 'utf8'));
  const negative = process.argv.includes('--negative');
  const verdict = validateInventory(inventory);
  if (!verdict.valid) { console.error(verdict.errors.join('\n')); process.exitCode = 1; }
  else if (negative) {
    const regression = runNegativeRegression(inventory);
    if (!regression.valid) { console.error(`negative regression missed ${regression.failures.join(', ')}`); process.exitCode = 1; }
    else console.log(`design-parity: green; ${inventory.contracts.length} rows; ${regression.cases} exact red/green boundary cases`);
  } else console.log(`design-parity: green; ${inventory.contracts.length} rows; captures remain pending by policy`);
}
