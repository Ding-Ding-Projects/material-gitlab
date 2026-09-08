#!/usr/bin/env node

/**
 * Produce reproducible release line-count metadata for the checked-out commit.
 *
 * The inventory is Git-tracked text only. Dependencies, vendored code, generated
 * output, lockfiles, and binary files are listed as exclusions rather than being
 * silently folded into a project's totals. Surviving-line authorship comes from
 * `git blame`; an automation line is one whose blamed commit author or
 * Co-Authored-By trailer identifies an automation identity (bot, automation,
 * agent, Claude, or Codex).
 */

import fs from 'node:fs';
import path from 'node:path';
import { spawn, spawnSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';

export function parseCommitMetadataBatch(output, batch, offset = 0) {
  const fields = output.split('\0');
  if (fields.at(-1) === '\n' || fields.at(-1) === '\r\n') fields.pop();
  if (fields.length !== batch.length * 4 || fields.length % 4 !== 0) {
    throw new Error(`git log returned malformed commit metadata for batch starting at ${offset}`);
  }
  const requested = new Set(batch);
  const seen = new Set();
  const records = [];
  for (let index = 0; index < fields.length; index += 4) {
    const [rawCommit, author, email, trailers] = fields.slice(index, index + 4);
    const commit = rawCommit.replace(/^\r?\n/, '');
    if (!/^[0-9a-f]{40}$/.test(commit) || !requested.has(commit) || seen.has(commit)) {
      throw new Error(`git log returned malformed commit identity: ${commit}`);
    }
    seen.add(commit);
    records.push({
      commit,
      author: author || 'Unknown',
      email: email || '',
      trailers,
      automation: /(bot|automation|agent|claude|codex)/i.test(`${author} ${email} ${trailers}`),
    });
  }
  if (seen.size !== requested.size) throw new Error(`git log omitted commit metadata in batch starting at ${offset}`);
  return records;
}

async function main() {
  const root = process.cwd();
  const args = new Set(process.argv.slice(2));
  const jsonOutput = args.has('--json');
  const requestedRevision = process.argv.find((arg) => arg.startsWith('--revision='))?.slice('--revision='.length) ?? 'HEAD';

function git(...gitArgs) {
  const result = spawnSync('git', ['-C', root, ...gitArgs], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  if (result.error || result.status !== 0) {
    throw new Error(`git ${gitArgs.join(' ')} failed: ${result.stderr?.trim() || result.error?.message || `exit ${result.status}`}`);
  }
  return result.stdout;
}

function runGitAsync(input, gitArgs) {
  return new Promise((resolve, reject) => {
    const child = spawn('git', ['-C', root, ...gitArgs], { stdio: [input === undefined ? 'ignore' : 'pipe', 'pipe', 'pipe'] });
    let stdout = '';
    let stderr = '';
    let outputSize = 0;
    const maxBuffer = 64 * 1024 * 1024;
    child.stdout.setEncoding('utf8');
    child.stderr.setEncoding('utf8');
    child.stdout.on('data', (chunk) => {
      outputSize += Buffer.byteLength(chunk);
      if (outputSize > maxBuffer) {
        child.kill();
        reject(new Error(`git ${gitArgs.join(' ')} exceeded ${maxBuffer} byte output limit`));
        return;
      }
      stdout += chunk;
    });
    child.stderr.on('data', (chunk) => { stderr += chunk; });
    child.on('error', (error) => reject(new Error(`git ${gitArgs.join(' ')} failed: ${error.message}`)));
    child.on('close', (status) => {
      if (status === 0) resolve(stdout);
      else reject(new Error(`git ${gitArgs.join(' ')} failed: ${stderr.trim() || `exit ${status}`}`));
    });
    if (input !== undefined) child.stdin.end(input);
  });
}

function gitAsync(...gitArgs) {
  return runGitAsync(undefined, gitArgs);
}

function gitAsyncWithInput(input, ...gitArgs) {
  return runGitAsync(input, gitArgs);
}

function countLines(text) {
  const lines = text.split(/\r\n|\n|\r/);
  if (lines.at(-1) === '') lines.pop();
  return {
    total: lines.length,
    nonBlank: lines.filter((line) => line.trim().length > 0).length,
  };
}

function bucketFor(file) {
  const normalized = file.replaceAll('\\', '/').toLowerCase();
  const extension = path.posix.extname(normalized);
  if (/(^|\/)(spec|test|tests|fixtures)(\/|$)/.test(normalized) || /(?:_spec|\.spec|\.test)\.[^.]+$/.test(normalized)) return 'tests';
  if (/\.(css|scss|sass|less|styl|vue|svelte|html|haml|slim|erb)$/.test(extension)) return 'styles-markup';
  return 'source';
}

function exclusionFor(file) {
  const normalized = file.replaceAll('\\', '/').toLowerCase();
  const name = path.posix.basename(normalized);
  if (/(^|\/)(node_modules|vendor|vendor_modules|third_party|third-party|\.git|tmp|log|coverage|dist|build|public\/assets)(\/|$)/.test(normalized)) return 'dependency/vendor/build output';
  if (/(?:^|\/)(?:package-lock\.json|yarn\.lock|pnpm-lock\.yaml|gemfile\.lock|gemfile\.next\.lock|pipfile\.lock|poetry\.lock|composer\.lock|cargo\.lock|go\.sum)$/.test(normalized) || /\.lock$/.test(name)) return 'lockfile';
  if (/(^|\/)(generated|generated_files|codegen|autogenerated)(\/|$)/.test(normalized) || /(?:\.generated|\.gen)\.[^.]+$/.test(name)) return 'generated output';
  return null;
}

function isLikelyBinary(buffer) {
  return buffer.includes(0);
}

const trackedFiles = git('ls-files', '-z', '--cached').split('\0').filter(Boolean);
const revision = git('rev-parse', requestedRevision).trim();
const commitDate = git('show', '-s', '--format=%cI', revision).trim();
const included = [];
const exclusions = [];
const excludedTotals = { files: 0, total: 0, nonBlank: 0 };

function recordExclusion(file, reason, buffer) {
  const counts = buffer && !isLikelyBinary(buffer) ? countLines(buffer.toString('utf8')) : { total: 0, nonBlank: 0 };
  excludedTotals.files += 1;
  excludedTotals.total += counts.total;
  excludedTotals.nonBlank += counts.nonBlank;
  exclusions.push({ file, reason, ...counts });
}

for (const file of trackedFiles) {
  const exclusion = exclusionFor(file);
  const absolute = path.join(root, file);
  let buffer;
  try {
    buffer = fs.readFileSync(absolute);
  } catch (error) {
    recordExclusion(file, `unreadable: ${error.message}`);
    continue;
  }
  if (exclusion) {
    recordExclusion(file, exclusion, buffer);
  } else if (isLikelyBinary(buffer)) {
    recordExclusion(file, 'binary file', buffer);
  } else {
    const counts = countLines(buffer.toString('utf8'));
    included.push({ file, bucket: bucketFor(file), generated: /(^|\/)(generated|codegen)(\/|$)|(?:\.generated|\.gen)\./i.test(file), ...counts });
  }
}

const blameConcurrency = Math.min(8, Math.max(1, Number(process.env.LINE_COUNT_BLAME_CONCURRENCY) || 8));
const blameEntries = included.filter((entry) => entry.total > 0);

async function mapWithWorkerPool(entries, worker, concurrency) {
  const results = new Array(entries.length);
  let next = 0;
  async function runWorker() {
    while (true) {
      const index = next++;
      if (index >= entries.length) return;
      results[index] = await worker(entries[index]);
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, entries.length) }, () => runWorker()));
  return results;
}

function parseIncrementalBlame(output, file) {
  const ranges = [];
  let pending = null;
  const flush = () => {
    if (!pending) return;
    ranges.push(pending);
    pending = null;
  };
  for (const line of output.split(/\r?\n/)) {
    const header = line.match(/^\^?([0-9a-f]{40})\s+\d+\s+\d+(?:\s+(\d+))?/);
    if (header) {
      flush();
      pending = { commit: header[1], lines: Number(header[2] ?? 1) };
    } else if (line === '') {
      flush();
    }
  }
  flush();
  if (ranges.some((range) => !Number.isInteger(range.lines) || range.lines < 1)) {
    throw new Error(`git blame --incremental returned an invalid range for ${file}`);
  }
  return ranges;
}

const blameResults = await mapWithWorkerPool(
  blameEntries,
  async (entry) => parseIncrementalBlame(await gitAsync('blame', '--incremental', revision, '--', entry.file), entry.file),
  blameConcurrency,
);

const commitIds = [...new Set(blameResults.flat().map((range) => range.commit))];
const commitCache = new Map();
async function loadCommitIdentities(commits) {
  const batchSize = 128;
  for (let offset = 0; offset < commits.length; offset += batchSize) {
    const batch = commits.slice(offset, offset + batchSize);
    const output = await gitAsyncWithInput(`${batch.join('\n')}\n`, 'log', '--no-walk', '--stdin', '--format=%H%x00%an%x00%ae%x00%(trailers:only,unfold=true)%x00');
    for (const { commit, author, email, automation } of parseCommitMetadataBatch(output, batch, offset)) {
      commitCache.set(commit, { author, email, automation });
    }
  }
  for (const commit of commits) {
    if (!commitCache.has(commit)) throw new Error(`git log omitted commit metadata for ${commit}`);
  }
}

await loadCommitIdentities(commitIds);

const authors = new Map();
function addAuthor(identity, count) {
  const key = `${identity.author} <${identity.email}>`;
  const current = authors.get(key) ?? { author: identity.author, email: identity.email, lines: 0, automation: identity.automation };
  current.lines += count;
  current.automation ||= identity.automation;
  authors.set(key, current);
}

for (const ranges of blameResults) {
  for (const range of ranges) addAuthor(commitCache.get(range.commit), range.lines);
}

const totals = { total: 0, nonBlank: 0 };
const buckets = {};
const generated = { total: 0, nonBlank: 0, files: 0 };
for (const entry of included) {
  totals.total += entry.total;
  totals.nonBlank += entry.nonBlank;
  const bucket = buckets[entry.bucket] ??= { files: 0, total: 0, nonBlank: 0 };
  bucket.files += 1;
  bucket.total += entry.total;
  bucket.nonBlank += entry.nonBlank;
  if (entry.generated) {
    generated.files += 1;
    generated.total += entry.total;
    generated.nonBlank += entry.nonBlank;
  }
}

const report = {
  schemaVersion: 1,
  repository: path.basename(root),
  revision,
  commitDate,
  counted: { files: included.length, ...totals, buckets, generated },
  grandTotal: { files: trackedFiles.length, total: totals.total + excludedTotals.total, nonBlank: totals.nonBlank + excludedTotals.nonBlank },
  exclusions: { files: exclusions.length, byReason: exclusions.reduce((result, item) => { result[item.reason] = (result[item.reason] || 0) + 1; return result; }, {}), entries: exclusions },
  attribution: { rule: 'git blame surviving lines; automation if blamed author/email or Co-Authored-By trailer matches bot, automation, agent, Claude, or Codex', authors: [...authors.values()].sort((a, b) => b.lines - a.lines), agentLines: [...authors.values()].filter((entry) => entry.automation).reduce((sum, entry) => sum + entry.lines, 0) },
};

if (jsonOutput) {
  console.log(JSON.stringify(report, null, 2));
} else {
  console.log(`Revision: ${report.revision} (${report.commitDate})`);
  console.log(`Counted: ${report.counted.files} files, ${report.counted.total} total lines, ${report.counted.nonBlank} nonblank lines`);
  for (const [name, bucket] of Object.entries(report.counted.buckets)) console.log(`  ${name}: ${bucket.files} files, ${bucket.total} total, ${bucket.nonBlank} nonblank`);
  console.log(`Generated: ${report.counted.generated.files} files, ${report.counted.generated.total} total, ${report.counted.generated.nonBlank} nonblank`);
  console.log(`Grand total (tracked text plus excluded files): ${report.grandTotal.files} files, ${report.grandTotal.total} counted lines, ${report.grandTotal.nonBlank} nonblank`);
  console.log(`Excluded: ${report.exclusions.files} files`);
  console.log(`Agent-attributed surviving lines: ${report.attribution.agentLines}`);
  for (const author of report.attribution.authors) console.log(`  ${author.lines}: ${author.author} <${author.email}>${author.automation ? ' [automation]' : ''}`);
}

}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await main();
