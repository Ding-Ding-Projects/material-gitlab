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

function hashJson(value) {
  return crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex');
}

function sameJson(left, right) {
  return JSON.stringify(left) === JSON.stringify(right);
}

function rootFile(root, relative) {
  if (typeof relative !== 'string' || path.isAbsolute(relative)) return null;
  const file = path.resolve(root, relative);
  return file.startsWith(`${root}${path.sep}`) ? file : null;
}

function requiredReferenceFonts(row, root) {
  const source = fs.readFileSync(path.join(root, row.referenceFile), 'utf8');
  const fonts = new Set();
  for (const match of source.matchAll(/['"](Google Sans(?: Text)?|Material Symbols Outlined)['"]/g)) fonts.add(match[1]);
  return [...fonts].sort();
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

function checkReceipt(errors, row, key, root, sourceCommit) {
  const evidence = row.evidence[key];
  if (evidence.status !== 'verified') return issue(errors, `${row.id}.evidence.${key} is not verified`);
  const evidencePath = path.join(root, evidence.path);
  const receiptPath = `${evidencePath}.receipt.json`;
  if (!fs.existsSync(receiptPath)) return issue(errors, `${row.id}.evidence.${key} receipt is missing: ${evidence.path}.receipt.json`);
  let receipt;
  try { receipt = JSON.parse(fs.readFileSync(receiptPath, 'utf8')); }
  catch { return issue(errors, `${row.id}.evidence.${key} receipt is not valid JSON`); }
  if (receipt.schemaVersion !== 2) issue(errors, `${row.id}.evidence.${key} receipt schemaVersion must be 2`);
  const expectedKind = key === 'referenceRaw' ? 'reference' : key === 'builtRaw' ? 'built' : key === 'sideBySide' ? 'side-by-side' : key === 'diff' ? 'diff' : null;
  if (expectedKind && receipt.kind !== expectedKind) issue(errors, `${row.id}.evidence.${key} receipt kind must be ${expectedKind}`);
  if (receipt.id !== row.id) issue(errors, `${row.id}.evidence.${key} receipt id does not match row`);
  if (receipt.status !== 'verified') issue(errors, `${row.id}.evidence.${key} receipt status must be verified`);
  if ((expectedKind === 'reference' || expectedKind === 'built') && (receipt.referenceFile !== row.referenceFile || receipt.referenceHash !== row.referenceHash)) issue(errors, `${row.id}.evidence.${key} receipt reference input is stale`);
  const expectedRoute = expectedKind === 'reference' ? row.referenceRoute : expectedKind === 'built' ? row.productionRoute : undefined;
  if (expectedRoute && receipt.route !== expectedRoute) issue(errors, `${row.id}.evidence.${key} receipt route does not match tuple route`);
  if (!sameJson(receipt.tuple, row.tuple) || receipt.tupleHash !== hashJson(row.tuple)) issue(errors, `${row.id}.evidence.${key} receipt tuple linkage is stale`);
  if (receipt.sourceCommit !== sourceCommit) issue(errors, `${row.id}.evidence.${key} receipt source commit does not match inventory`);
  if (!/^[a-f0-9]{64}$/.test(receipt?.artifact?.sha256 || '')) issue(errors, `${row.id}.evidence.${key} receipt artifact hash is required`);
  else if ((key === 'sideBySide' || key === 'diff') && receipt.artifact.sha256 !== evidence.sha256) issue(errors, `${row.id}.evidence.${key} receipt artifact hash does not match evidence`);
  if (key === 'referenceRaw' || key === 'builtRaw') {
    if (receipt?.raw?.path !== evidence.path || receipt?.raw?.sha256 !== evidence.sha256) issue(errors, `${row.id}.evidence.${key} receipt raw input linkage is stale`);
    const expectedWidth = Math.round(row.tuple.viewport.width * row.tuple.scale);
    const expectedHeight = Math.round(row.tuple.viewport.height * row.tuple.scale);
    if (receipt?.raw?.width !== expectedWidth || receipt?.raw?.height !== expectedHeight) issue(errors, `${row.id}.evidence.${key} receipt dimensions do not match tuple`);
    const manifestPath = rootFile(root, receipt?.artifact?.manifest?.path);
    if (!manifestPath || !fs.existsSync(manifestPath) || sha256(manifestPath) !== receipt.artifact.manifest.sha256) issue(errors, `${row.id}.evidence.${key} receipt artifact manifest is missing or stale`);
    else {
      let manifest;
      try { manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8')); }
      catch { issue(errors, `${row.id}.evidence.${key} receipt artifact manifest is not valid JSON`); }
      if (manifest && (manifest.schemaVersion !== 1 || manifest.sourceCommit !== sourceCommit || !manifest.artifacts?.some((artifact) => artifact.path === receipt.artifact.path && artifact.sha256 === receipt.artifact.sha256))) issue(errors, `${row.id}.evidence.${key} receipt artifact manifest does not bind the rendered artifact`);
      const artifactPath = rootFile(root, receipt?.artifact?.path);
      if (!artifactPath || !fs.existsSync(artifactPath) || sha256(artifactPath) !== receipt?.artifact?.sha256) issue(errors, `${row.id}.evidence.${key} rendered artifact is missing or stale`);
    }
    if (key === 'referenceRaw') {
      const proof = receipt.fontProof;
      if (proof?.transport !== 'cheap Lowlevel headless route' || !proof?.availability || typeof proof.availability !== 'object') issue(errors, `${row.id}.evidence.referenceRaw receipt needs a cheap Lowlevel document.fonts proof`);
      else for (const family of requiredReferenceFonts(row, root)) if (proof.availability[family] !== true) issue(errors, `${row.id}.evidence.referenceRaw required font is unavailable: ${family}`);
    }
  } else {
    const reference = row.evidence.referenceRaw;
    const built = row.evidence.builtRaw;
    if (receipt?.inputs?.reference?.path !== reference.path || receipt?.inputs?.reference?.sha256 !== reference.sha256 || receipt?.inputs?.built?.path !== built.path || receipt?.inputs?.built?.sha256 !== built.sha256) issue(errors, `${row.id}.evidence.${key} receipt inputs do not link to the verified raw captures`);
    for (const [kind, evidenceInput] of [['reference', reference], ['built', built]]) {
      const inputReceipt = receipt?.inputReceipts?.[kind];
      const inputReceiptPath = rootFile(root, inputReceipt?.path);
      if (!inputReceiptPath || !fs.existsSync(inputReceiptPath) || sha256(inputReceiptPath) !== inputReceipt.sha256) issue(errors, `${row.id}.evidence.${key} ${kind} raw receipt is missing or stale`);
      else {
        const raw = JSON.parse(fs.readFileSync(inputReceiptPath, 'utf8'));
        if (raw.id !== row.id || raw.kind !== kind || raw.sourceCommit !== sourceCommit || raw.raw?.path !== evidenceInput.path || raw.raw?.sha256 !== evidenceInput.sha256 || !sameJson(raw.tuple, row.tuple)) issue(errors, `${row.id}.evidence.${key} ${kind} raw receipt does not match its input`);
      }
    }
    if (key === 'diff') {
      let diff;
      try { diff = JSON.parse(fs.readFileSync(evidencePath, 'utf8')); }
      catch { return issue(errors, `${row.id}.evidence.diff is not valid JSON`); }
      if (diff.schemaVersion !== 2 || diff.id !== row.id || diff.sourceCommit !== sourceCommit || !sameJson(diff.tuple, row.tuple) || diff.tupleHash !== hashJson(row.tuple)) issue(errors, `${row.id}.evidence.diff record provenance is stale`);
      if (!sameJson(diff.inputs, receipt.inputs)) issue(errors, `${row.id}.evidence.diff record inputs do not match receipt`);
      const reviewPath = `${evidencePath}.review.json`;
      if (!fs.existsSync(reviewPath)) issue(errors, `${row.id}.evidence.diff requires an immutable approval record`);
      else {
        const review = JSON.parse(fs.readFileSync(reviewPath, 'utf8'));
        if (review.schemaVersion !== 1 || review.status !== 'approved' || review.id !== row.id || review.sourceCommit !== sourceCommit || review.tupleHash !== hashJson(row.tuple) || review.diff?.path !== evidence.path || review.diff?.sha256 !== evidence.sha256 || typeof review.reviewer !== 'string' || !review.reviewer.trim() || typeof review.approval !== 'string' || !review.approval.trim()) issue(errors, `${row.id}.evidence.diff approval record is incomplete or stale`);
      }
    }
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

export function validateCompletion(inventory, { root = ROOT, checkReferenceHashes = true } = {}) {
  const structural = validateInventory(inventory, { root, checkReferenceHashes });
  const errors = [...structural.errors];
  if (!/^[a-f0-9]{40}$/.test(inventory?.sourceCommit || '')) issue(errors, 'sourceCommit must be a full 40-character commit for completion');
  if (inventory?.capturePolicy?.evidenceStatus !== 'verified') issue(errors, 'capturePolicy.evidenceStatus must be verified for completion');
  for (const row of inventory?.contracts || []) {
    if (row.productionRouteStatus !== 'known') issue(errors, `${row.id}.productionRouteStatus must be known for completion`);
    if (row.materialAudit?.status !== 'verified') issue(errors, `${row.id}.materialAudit must be verified for completion`);
    if (typeof row.materialAudit?.review !== 'string' || !row.materialAudit.review.trim() || /pending|placeholder/i.test(row.materialAudit.review)) issue(errors, `${row.id}.materialAudit.review requires a completed review record`);
    for (const key of ['referenceRaw', 'builtRaw', 'sideBySide', 'diff']) checkReceipt(errors, row, key, root, inventory.sourceCommit);
    for (const [index, deviation] of (row.intentionalDeviations || []).entries()) {
      if (!deviation?.approval || /pending|placeholder/i.test(deviation.approval)) issue(errors, `${row.id}.intentionalDeviations[${index}].approval requires a completed approval record`);
    }
  }
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
    ['materialAudit'], ['materialAudit', 'primitives'], ['evidence', 'referenceRaw'], ['evidence', 'builtRaw'], ['evidence', 'sideBySide'], ['evidence', 'diff'], ['captureProvenance', 'reference'], ['captureProvenance', 'built'], ['captureProvenance', 'diff'],
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
  const strict = process.argv.includes('--strict');
  const verdict = strict ? validateCompletion(inventory) : validateInventory(inventory);
  if (!verdict.valid) { console.error(verdict.errors.join('\n')); process.exitCode = 1; }
  else if (negative) {
    const regression = runNegativeRegression(inventory);
    if (!regression.valid) { console.error(`negative regression missed ${regression.failures.join(', ')}`); process.exitCode = 1; }
    else console.log(`design-parity: green; ${inventory.contracts.length} rows; ${regression.cases} exact red/green boundary cases`);
  } else if (strict) console.log(`design-parity: complete; ${inventory.contracts.length} rows; all receipts and audits are verified`);
  else console.log(`design-parity: structural green; ${inventory.contracts.length} rows; captures remain pending by policy`);
}
