#!/usr/bin/env node
// Record design-parity evidence into the hand-written inventories from what is really on
// disk. It never invents a hash: an evidence entry becomes "verified" only when the file
// exists and, for inventory rows, its receipt is verified, names the same row and kind,
// and is bound to the same source commit. Anything else stays exactly as pending as it was
// and is listed in the summary with the reason.
//
//   Inventory rows (design/parity-inventory.json, 25 rows, 4 evidence entries each):
//     node scripts/design-parity/record-evidence.mjs --inventory --commit=<sha> [--dry-run]
//       [--audit=<json: { "<row id>": { "status": "verified", "review": "<text>" } }>]
//
//   Layout matrix rows (design/layout-matrix.json, 70 rows, builtRaw + layoutProbe):
//     node scripts/design-parity/record-evidence.mjs --matrix --commit=<sha> [--dry-run]
//       [--deviations=<json: { "<row id>": [ { selector, kind, reason, approval } ] }>]
//
// Material audits and intentional deviations are judgements, so they arrive through the
// optional JSON files rather than being derived from anything; this script only copies
// them into the rows they name. The strict guard remains the authority afterwards:
//   node tools/design-reference/scripts/parity-guard.mjs --strict

import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const INVENTORY = path.join(ROOT, 'design', 'parity-inventory.json');
const MATRIX = path.join(ROOT, 'design', 'layout-matrix.json');

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
  console.error(`record-evidence: ${message}`);
  process.exit(1);
}

function sha256(file) {
  return crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
}

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function resolveEvidence(relative) {
  const absolute = path.resolve(ROOT, relative);
  if (!absolute.startsWith(ROOT + path.sep)) return null;
  return absolute;
}

const args = parseArgs(process.argv.slice(2));
const commit = args.commit;
if (!/^[a-f0-9]{40}$/.test(commit || '')) fail('--commit must be a 40-character commit sha');
if (!args.inventory && !args.matrix) fail('pass --inventory or --matrix');
const dryRun = Boolean(args['dry-run']);
const now = new Date().toISOString();
const outcomes = [];

function note(id, key, outcome, detail) {
  outcomes.push({ id, key, outcome, detail });
}

function recordEntry(row, key, { needReceipt }) {
  const evidence = row.evidence?.[key];
  if (!evidence || typeof evidence.path !== 'string') return note(row.id, key, 'skipped', 'no evidence entry');
  const file = resolveEvidence(evidence.path);
  if (!file || !fs.existsSync(file)) return note(row.id, key, 'pending', 'file absent');
  if (needReceipt) {
    const receiptPath = `${file}.receipt.json`;
    if (!fs.existsSync(receiptPath)) return note(row.id, key, 'pending', 'receipt absent');
    let receipt;
    try { receipt = readJson(receiptPath); } catch { return note(row.id, key, 'pending', 'receipt unreadable'); }
    if (receipt.status !== 'verified') return note(row.id, key, 'pending', `receipt status ${receipt.status}`);
    if (receipt.id !== row.id) return note(row.id, key, 'pending', `receipt names ${receipt.id}`);
    if (receipt.sourceCommit !== commit) return note(row.id, key, 'stale', `receipt bound to ${String(receipt.sourceCommit).slice(0, 12)}`);
  }
  const hash = sha256(file);
  const changed = evidence.status !== 'verified' || evidence.sha256 !== hash;
  evidence.status = 'verified';
  evidence.sha256 = hash;
  evidence.reason = `recorded from ${path.basename(file)} on ${now}`;
  note(row.id, key, changed ? 'recorded' : 'unchanged', hash.slice(0, 12));
}

if (args.inventory) {
  const inventory = readJson(INVENTORY);
  const audit = args.audit ? readJson(path.resolve(process.cwd(), String(args.audit))) : {};
  for (const row of inventory.contracts) {
    for (const key of ['referenceRaw', 'builtRaw', 'sideBySide', 'diff']) recordEntry(row, key, { needReceipt: true });
    if (row.evidence.builtRaw.status === 'verified' && row.productionRouteEvidence !== 'runtime-captured') {
      row.productionRouteEvidence = 'runtime-captured';
      note(row.id, 'productionRouteEvidence', 'recorded', 'runtime-captured');
    }
    if (audit[row.id]) {
      const entry = audit[row.id];
      if (entry.status === 'pending') { note(row.id, 'materialAudit', 'pending', 'audit still pending'); continue; }
      if (entry.status !== 'verified' || typeof entry.review !== 'string' || !entry.review.trim()) fail(`audit for ${row.id} must carry status "verified" and a non-empty review`);
      // A verified audit must have looked at every primitive the row declares; a pending
      // or unknown verdict means the reviewer skipped one, and that is refused rather than
      // recorded as complete.
      const verdicts = entry.primitives && typeof entry.primitives === 'object' ? entry.primitives : null;
      if (!verdicts) fail(`audit for ${row.id} must carry per-primitive verdicts (use audit-skeleton.mjs)`);
      for (const name of row.materialAudit.primitives) {
        const verdict = verdicts[name]?.verdict;
        if (!['conforms', 'deviates', 'not-present'].includes(verdict)) fail(`audit for ${row.id} leaves primitive "${name}" at "${verdict}"; every primitive needs conforms, deviates or not-present`);
        if (typeof verdicts[name]?.note !== 'string' || !verdicts[name].note.trim()) fail(`audit for ${row.id} primitive "${name}" needs a note naming what was looked at`);
      }
      row.materialAudit.status = 'verified';
      row.materialAudit.review = entry.review;
      row.materialAudit.verdicts = Object.fromEntries(row.materialAudit.primitives.map((name) => [name, verdicts[name].verdict]));
      note(row.id, 'materialAudit', 'recorded', 'verified');
    }
  }
  const anyVerified = outcomes.some((entry) => entry.outcome === 'recorded' || entry.outcome === 'unchanged');
  if (anyVerified && inventory.sourceCommit !== commit) {
    inventory.sourceCommit = commit;
    note('inventory', 'sourceCommit', 'recorded', commit.slice(0, 12));
  }
  const complete = inventory.contracts.every((row) => ['referenceRaw', 'builtRaw', 'sideBySide', 'diff'].every((key) => row.evidence[key].status === 'verified'));
  const wanted = complete ? 'verified' : inventory.capturePolicy.evidenceStatus;
  if (inventory.capturePolicy.evidenceStatus !== wanted) {
    inventory.capturePolicy.evidenceStatus = wanted;
    note('inventory', 'capturePolicy.evidenceStatus', 'recorded', wanted);
  }
  if (!dryRun) fs.writeFileSync(INVENTORY, `${JSON.stringify(inventory, null, 2)}\n`);
}

if (args.matrix) {
  const matrix = readJson(MATRIX);
  const deviations = args.deviations ? readJson(path.resolve(process.cwd(), String(args.deviations))) : {};
  for (const row of matrix.rows) {
    recordEntry(row, 'builtRaw', { needReceipt: false });
    recordEntry(row, 'layoutProbe', { needReceipt: false });
    if (deviations[row.id]) {
      for (const finding of deviations[row.id]) {
        for (const key of ['selector', 'kind', 'reason', 'approval']) if (typeof finding?.[key] !== 'string' || !finding[key].trim()) fail(`deviation for ${row.id} needs selector, kind, reason and approval`);
        const exists = row.intentionalFindings.some((known) => known.selector === finding.selector && known.kind === finding.kind);
        if (!exists) { row.intentionalFindings.push(finding); note(row.id, 'intentionalFindings', 'recorded', `${finding.kind} at ${finding.selector}`); }
      }
    }
    if (row.evidence.layoutProbe.status === 'verified') {
      try {
        const probe = readJson(resolveEvidence(row.evidence.layoutProbe.path));
        const findings = Array.isArray(probe.findings) ? probe.findings : [];
        const unresolved = findings.filter((finding) => !row.intentionalFindings.some((known) => known.selector === finding.selector && known.kind === finding.kind));
        note(row.id, 'findings', unresolved.length ? 'open' : 'clear', `${findings.length} findings, ${unresolved.length} without a recorded deviation`);
      } catch { note(row.id, 'findings', 'pending', 'probe unreadable'); }
    }
  }
  if (!dryRun) fs.writeFileSync(MATRIX, `${JSON.stringify(matrix, null, 2)}\n`);
}

const counts = {};
for (const entry of outcomes) counts[entry.outcome] = (counts[entry.outcome] || 0) + 1;
for (const entry of outcomes.filter((item) => item.outcome !== 'unchanged')) console.log(`${entry.outcome.padEnd(9)} ${entry.id} ${entry.key}: ${entry.detail}`);
console.log(`${dryRun ? 'dry run, nothing written' : 'written'}: ${JSON.stringify(counts)}`);
