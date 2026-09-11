#!/usr/bin/env node
// Emit the Material Design 3 audit skeleton for every design-parity row, so the 25
// audits written after capture follow one form and none of the 15 primitives can be
// skipped silently.
//
//   node scripts/design-parity/audit-skeleton.mjs > artifacts/parity/_local/audit.draft.json
//
// The output maps each row id to { status: "pending", review: "", primitives: { <name>:
// { verdict: "pending", note: "" } } }. A reviewer fills every primitive verdict with
// "conforms", "deviates" or "not-present" and a note that names what was looked at, then
// sets status to "verified" and writes the row-level review. record-evidence.mjs copies
// only rows whose status is "verified" and whose review is non-empty, and it refuses a
// verified row that still carries a pending primitive.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const inventory = JSON.parse(fs.readFileSync(path.join(ROOT, 'design', 'parity-inventory.json'), 'utf8'));

const skeleton = {};
for (const row of inventory.contracts) {
  const primitives = {};
  for (const name of row.materialAudit.primitives) primitives[name] = { verdict: 'pending', note: '' };
  skeleton[row.id] = { status: 'pending', review: '', primitives };
}
process.stdout.write(`${JSON.stringify(skeleton, null, 2)}\n`);
