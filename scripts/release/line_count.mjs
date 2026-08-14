#!/usr/bin/env node

/**
 * Produce reproducible release line-count metadata for the checked-out commit.
 *
 * The inventory is Git-tracked text only. Dependencies, vendored code, generated
 * output, lockfiles, and binary files are listed as exclusions rather than being
 * silently folded into a project's totals. Surviving-line authorship comes from
 * `git blame`; an automation line is one whose blamed commit author or
 * Co-Authored-By trailer identifies an automation identity (bot, automation,
 * agent, Claude, or Codex). Nonzero blame exits with no diagnostic are retried
 * only after the active pool drains, with bounded backoff and progressively
 * lower concurrency through a final serial attempt. Cancellations, signals,
 * spawn failures, and ordinary Git errors remain fail-closed and retain their
 * command, path, exit, signal, stderr, byte-count, and elapsed-time details.
 */

import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';

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

function describeGitCommand(gitArgs) {
  return ['git', '-C', root, ...gitArgs].map((part) => JSON.stringify(part)).join(' ');
}

function formatExitStatus(status) {
  if (status === null || status === undefined) return '<none>';
  const unsigned = status >>> 0;
  return unsigned >= 0x80000000 ? `${status} (0x${unsigned.toString(16).toUpperCase().padStart(8, '0')})` : String(status);
}

class GitCommandError extends Error {
  constructor({ gitArgs, status = null, signal = null, stderr = '', spawnError = null, reason = null, stdoutBytes = 0, elapsedMs = 0 }) {
    const details = [
      `command: ${describeGitCommand(gitArgs)}`,
      `exit: ${formatExitStatus(status)}`,
      `signal: ${signal ?? '<none>'}`,
      `spawn error: ${spawnError ? `${spawnError.code ?? spawnError.name}: ${spawnError.message}` : '<none>'}`,
      `reason: ${reason ?? '<none>'}`,
      `stdout bytes: ${stdoutBytes}`,
      `stderr bytes: ${Buffer.byteLength(stderr)}`,
      `elapsed ms: ${elapsedMs.toFixed(3)}`,
      `stderr JSON: ${JSON.stringify(stderr)}`,
    ];
    super(`Git child command failed:\n${details.join('\n')}`);
    this.name = 'GitCommandError';
    this.gitArgs = [...gitArgs];
    this.status = status;
    this.signal = signal;
    this.stderr = stderr;
    this.spawnError = spawnError;
    this.reason = reason;
    this.stdoutBytes = stdoutBytes;
    this.stderrBytes = Buffer.byteLength(stderr);
    this.elapsedMs = elapsedMs;
  }
}

function runGitAsync(input, gitArgs) {
  return new Promise((resolve, reject) => {
    const child = spawn('git', ['-C', root, ...gitArgs], { stdio: [input === undefined ? 'ignore' : 'pipe', 'pipe', 'pipe'] });
    let stdout = '';
    let stderr = '';
    let outputSize = 0;
    let settled = false;
    const startedAt = process.hrtime.bigint();
    const maxBuffer = 64 * 1024 * 1024;
    const elapsedMs = () => Number(process.hrtime.bigint() - startedAt) / 1_000_000;
    const rejectOnce = (error) => {
      if (settled) return;
      settled = true;
      reject(error);
    };
    child.stdout.setEncoding('utf8');
    child.stderr.setEncoding('utf8');
    child.stdout.on('data', (chunk) => {
      outputSize += Buffer.byteLength(chunk);
      if (outputSize > maxBuffer) {
        child.kill();
        rejectOnce(new GitCommandError({ gitArgs, stderr, reason: `stdout exceeded ${maxBuffer} byte output limit`, stdoutBytes: outputSize, elapsedMs: elapsedMs() }));
        return;
      }
      stdout += chunk;
    });
    child.stderr.on('data', (chunk) => { stderr += chunk; });
    child.on('error', (error) => rejectOnce(new GitCommandError({ gitArgs, stderr, spawnError: error, stdoutBytes: outputSize, elapsedMs: elapsedMs() })));
    child.on('close', (status, signal) => {
      if (settled) return;
      settled = true;
      if (status === 0) resolve(stdout);
      else reject(new GitCommandError({ gitArgs, status, signal, stderr, stdoutBytes: outputSize, elapsedMs: elapsedMs() }));
    });
    if (input !== undefined) {
      child.stdin.on('error', (error) => rejectOnce(new GitCommandError({ gitArgs, stderr, spawnError: error, reason: 'stdin write failed', stdoutBytes: outputSize, elapsedMs: elapsedMs() })));
      child.stdin.end(input);
    }
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

function isTransientBlameFailure(error) {
  if (!(error instanceof GitCommandError)) return false;
  if (error.reason || error.signal || error.spawnError) return false;
  if (typeof error.status !== 'number' || error.status === 0) return false;
  const unsignedStatus = error.status >>> 0;
  if (unsignedStatus === 0xC000013A || error.status === 130) return false;
  return error.stderr.trim() === '';
}

function blameRetryConcurrencies(initialConcurrency) {
  return [initialConcurrency, Math.max(1, Math.floor(initialConcurrency / 2)), 1];
}

function describeBlameFailure(entry, history) {
  const attempts = history.map(({ concurrency, error }, index) => [
    `attempt ${index + 1} at concurrency ${concurrency}`,
    error instanceof Error ? error.message : String(error),
  ].join('\n')).join('\n---\n');
  return new Error(`git blame failed for path ${JSON.stringify(entry.file)} after ${history.length} attempt(s):\n${attempts}`);
}

async function mapBlamesWithRetry(entries, worker, initialConcurrency, sleep = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds))) {
  const results = new Array(entries.length);
  const histories = new Map();
  const concurrencyLevels = blameRetryConcurrencies(initialConcurrency);
  let pending = entries.map((entry, index) => ({ entry, index }));

  for (let stage = 0; stage < concurrencyLevels.length && pending.length > 0; stage += 1) {
    if (stage > 0) await sleep(stage === 1 ? 250 : 1000);
    const concurrency = Math.min(concurrencyLevels[stage], pending.length);
    const outcomes = await mapWithWorkerPool(pending, async ({ entry, index }) => {
      try {
        return { ok: true, value: await worker(entry, { concurrency, attempt: (histories.get(index)?.length ?? 0) + 1 }) };
      } catch (error) {
        return { ok: false, error };
      }
    }, concurrency);

    const retry = [];
    const terminal = [];
    for (let offset = 0; offset < pending.length; offset += 1) {
      const item = pending[offset];
      const outcome = outcomes[offset];
      if (outcome.ok) {
        results[item.index] = outcome.value;
        continue;
      }
      const history = histories.get(item.index) ?? [];
      history.push({ concurrency, error: outcome.error });
      histories.set(item.index, history);
      if (isTransientBlameFailure(outcome.error) && stage + 1 < concurrencyLevels.length) retry.push(item);
      else terminal.push(item);
    }

    if (terminal.length > 0) {
      terminal.sort((left, right) => left.index - right.index);
      const item = terminal[0];
      const history = histories.get(item.index);
      if (history.length === 1 && !isTransientBlameFailure(history[0].error)) throw history[0].error;
      throw describeBlameFailure(item.entry, history);
    }
    pending = retry;
  }

  assert.equal(pending.length, 0, 'retry loop must resolve or reject every pending blame');
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

async function runSelfTest() {
  const transientInterrupted = new GitCommandError({ gitArgs: ['blame', '--incremental', 'HEAD', '--', 'interrupted.rb'], status: 3221225786 });
  const transientEmpty = new GitCommandError({ gitArgs: ['blame', '--incremental', 'HEAD', '--', 'empty.rb'], status: 1 });
  const terminatedBySignal = new GitCommandError({ gitArgs: ['blame', '--incremental', 'HEAD', '--', 'signalled.rb'], signal: 'SIGTERM' });
  const permanent = new GitCommandError({ gitArgs: ['blame', '--incremental', 'HEAD', '--', 'missing.rb'], status: 128, stderr: 'fatal: no such path missing.rb\n' });
  assert.equal(isTransientBlameFailure(transientInterrupted), false);
  assert.match(transientInterrupted.message, /3221225786 \(0xC000013A\)/);
  assert.match(transientInterrupted.message, /signal: <none>/);
  assert.match(transientInterrupted.message, /stderr JSON: ""/);
  assert.equal(isTransientBlameFailure(transientEmpty), true);
  assert.equal(isTransientBlameFailure(terminatedBySignal), false);
  assert.equal(isTransientBlameFailure(permanent), false);

  const attempts = new Map();
  const ordered = await mapBlamesWithRetry(
    [{ file: 'first.rb' }, { file: 'second.rb' }, { file: 'third.rb' }],
    async (entry, context) => {
      const seen = attempts.get(entry.file) ?? [];
      seen.push(context.concurrency);
      attempts.set(entry.file, seen);
      if (entry.file === 'second.rb' && context.concurrency > 1) {
        throw new GitCommandError({ gitArgs: ['blame', '--incremental', 'HEAD', '--', entry.file], status: 1 });
      }
      return `${entry.file}:${context.concurrency}`;
    },
    8,
    async () => {},
  );
  assert.deepEqual(ordered, ['first.rb:3', 'second.rb:1', 'third.rb:3']);
  assert.deepEqual(attempts.get('first.rb'), [3]);
  assert.deepEqual(attempts.get('second.rb'), [3, 1]);
  assert.deepEqual(attempts.get('third.rb'), [3]);

  const fallbackEntries = Array.from({ length: 8 }, (_, index) => ({ file: `fallback-${index}.rb` }));
  const fallbackAttempts = new Map();
  const fallbackResults = await mapBlamesWithRetry(fallbackEntries, async (entry, context) => {
    const seen = fallbackAttempts.get(entry.file) ?? [];
    seen.push(context.concurrency);
    fallbackAttempts.set(entry.file, seen);
    if (context.concurrency > 1) {
      throw new GitCommandError({ gitArgs: ['blame', '--incremental', 'HEAD', '--', entry.file], status: 1 });
    }
    return entry.file;
  }, 8, async () => {});
  assert.deepEqual(fallbackResults, fallbackEntries.map((entry) => entry.file));
  for (const entry of fallbackEntries) assert.deepEqual(fallbackAttempts.get(entry.file), [8, 4, 1]);

  let permanentAttempts = 0;
  await assert.rejects(
    mapBlamesWithRetry([{ file: 'missing.rb' }], async () => {
      permanentAttempts += 1;
      throw permanent;
    }, 8, async () => {}),
    (error) => error === permanent,
  );
  assert.equal(permanentAttempts, 1);

  let exhaustedAttempts = 0;
  await assert.rejects(
    mapBlamesWithRetry([{ file: 'unstable.rb' }], async () => {
      exhaustedAttempts += 1;
      throw new GitCommandError({ gitArgs: ['blame', '--incremental', 'HEAD', '--', 'unstable.rb'], status: 1 });
    }, 8, async () => {}),
    (error) => {
      assert.match(error.message, /path "unstable\.rb" after 3 attempt\(s\)/);
      assert.equal((error.message.match(/stderr JSON: ""/g) ?? []).length, 3);
      assert.match(error.message, /attempt 3 at concurrency 1/);
      return true;
    },
  );
  assert.equal(exhaustedAttempts, 3);

  const missingPath = '__line_count_self_test_missing_path__';
  await assert.rejects(
    gitAsync('blame', '--incremental', revision, '--', missingPath),
    (error) => {
      assert.equal(isTransientBlameFailure(error), false);
      assert.match(error.message, /exit: 128/);
      assert.match(error.message, /signal: <none>/);
      assert.match(error.message, new RegExp(missingPath));
      assert.match(error.message, /stderr JSON: "(?!")/);
      return true;
    },
  );

  console.log('PASS: 6 line-counter retry, serial-fallback, ordering, fail-closed, and diagnostic scenarios');
}

if (args.has('--self-test')) {
  await runSelfTest();
  process.exit(0);
}

const blameResults = await mapBlamesWithRetry(
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
    const output = await gitAsyncWithInput(`${batch.join('\n')}\n`, 'log', '-z', '--no-walk', '--stdin', '--format=%H%x00%an%x00%ae%x00%(trailers:only,unfold=true)');
    const fields = output.split('\0');
    if (fields.at(-1) === '') fields.pop();
    if (fields.length !== batch.length * 4 || fields.length % 4 !== 0) {
      throw new Error(`git log returned malformed commit metadata for batch starting at ${offset}`);
    }
    const requested = new Set(batch);
    const seen = new Set();
    for (let index = 0; index < fields.length; index += 4) {
      const [commit, author, email, trailers] = fields.slice(index, index + 4);
      if (!/^[0-9a-f]{40}$/.test(commit) || !requested.has(commit) || seen.has(commit)) {
        throw new Error(`git log returned malformed commit identity: ${commit}`);
      }
      seen.add(commit);
      const identity = {
        author: author || 'Unknown',
        email: email || '',
        automation: /(bot|automation|agent|claude|codex)/i.test(`${author} ${email} ${trailers}`),
      };
      commitCache.set(commit, identity);
    }
    if (seen.size !== requested.size) throw new Error(`git log omitted commit metadata in batch starting at ${offset}`);
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
