import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { existingFile } from './evidence-paths.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const args = Object.fromEntries(process.argv.slice(2).filter((arg) => arg.startsWith('--')).map((arg) => { const [key, ...rest] = arg.slice(2).split('='); return [key, rest.join('=') || true]; }));
const hash = (file) => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');

try {
  if (!args.diff || !args.reviewer || !args.approval) throw new Error('usage requires --diff, --reviewer, and --approval');
  const diffPath = existingFile(ROOT, String(args.diff), 'diff record');
  const diff = JSON.parse(fs.readFileSync(diffPath, 'utf8'));
  if (diff.schemaVersion !== 2 || diff.status !== 'unreviewed' || !diff.id || !diff.sourceCommit || !diff.tupleHash) throw new Error('diff record is not an immutable unreviewed v2 record');
  const approval = String(args.approval);
  if (/pending|placeholder/i.test(approval)) throw new Error('approval must identify a completed review record');
  const review = { schemaVersion: 1, id: diff.id, status: 'approved', diff: { path: String(args.diff).replaceAll('\\', '/'), sha256: hash(diffPath) }, sourceCommit: diff.sourceCommit, tupleHash: diff.tupleHash, reviewer: String(args.reviewer), approval, reviewedAt: new Date().toISOString(), tool: 'tools/design-reference/scripts/review-diff.mjs' };
  const reviewPath = `${diffPath}.review.json`;
  if (fs.existsSync(reviewPath)) throw new Error('review record already exists and is immutable');
  fs.writeFileSync(reviewPath, `${JSON.stringify(review, null, 2)}\n`, 'utf8');
  console.log(JSON.stringify({ status: 'approved', review: path.relative(ROOT, reviewPath).replaceAll('\\', '/'), diff: review.diff }, null, 2));
} catch (error) {
  console.error(`design-reference-review-diff: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
}
