#!/usr/bin/env node

/**
 * Fail-closed scan for internal shorthand in files this repository publishes.
 *
 * This repository is public. Some wording used in private working notes must
 * never reach a public record: a commit, a comment, a filename, a shipped
 * string, or the site this repository deploys. That has already happened once
 * (see the commit that renamed site/scripts/completeness-check.mjs), and it
 * happened because nothing was checking.
 *
 * The term list is NOT stored here. Publishing the list of words that must not
 * be published would defeat the whole point, so the list is resolved at run
 * time from a private source outside this repository:
 *
 *   1. $PRIVATE_VOCABULARY_FILE, when set
 *   2. ../agent-global-memory/PERSONAL_VOCABULARY.json, relative to this
 *      repository's parent directory
 *
 * WHAT THIS DOES AND DOES NOT PROVE
 *
 * It proves that no resolved term appears in the scanned files. It cannot
 * prove the list is complete, because the list lives somewhere this process
 * only reads. A term added privately and never scanned for is invisible here.
 *
 * FAIL OPEN FOR AN OUTSIDER, FAIL CLOSED FOR A HIT
 *
 * A contributor with no private source is skipped with a printed reason, and
 * exits 0. Refusing a stranger a build of a public repository would be absurd.
 * What is refused is a scan that runs, finds a term, and would otherwise let
 * it through.
 */

import { readFileSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = resolve(fileURLToPath(new URL('..', import.meta.url)));

/**
 * Never scanned. Dependencies, upstream translations, fixtures and specs are
 * not written by this project and are not ours to rewrite.
 */
const SKIPPED_PREFIXES = [
  'node_modules/',
  'site/node_modules/',
  'doc/',
  'doc-locale/',
  'locale/',
  'spec/',
  'ee/spec/',
  'qa/',
  'vendor/',
  'gems/',
  'changelogs/',
  'db/',
  'workhorse/',
];

/**
 * Files this overlay actually authored, as opposed to the imported GitLab
 * tree around them. This split exists because of a real measurement rather
 * than a preference.
 *
 * Some private terms are ordinary English words. Scanning the whole imported
 * tree for those produced 114 false positives in one run -- heap dumps, memory
 * samplers, a database vacuum section, an emoji sprite sheet -- against a
 * single genuine hit. A check with that ratio is a check everybody learns to
 * ignore, which is worse than no check at all.
 *
 * So: multi-word terms are distinctive enough to scan everywhere tracked.
 * Single-word terms are scanned only in files below, which we own and can fix.
 *
 * What this gives up, stated plainly: a single-word term sitting in imported
 * GitLab source is not detected. That is a deliberate trade, not an oversight.
 */
const OVERLAY_PREFIXES = [
  'site/',
  'design/',
  'tools/',
  '.github/',
  'app/assets/stylesheets/md3/',
  'app/assets/javascripts/md3/',
  'app/assets/javascripts/material_system/',
  'scripts/verify-',
];

const OVERLAY_FILES = new Set([
  'build.bat',
  'build-installer.bat',
  'README.md',
  'ROADMAP.md',
  'HANDOFF.md',
  'BUILD.md',
  'upstream-overlay.json',
  'app/assets/stylesheets/color_modes/_md3.scss',
  'doc/development/fe_guide/md3.md',
]);

function isOverlayFile(path) {
  return OVERLAY_FILES.has(path) || OVERLAY_PREFIXES.some((prefix) => path.startsWith(prefix));
}

/**
 * Deliberately public. This name is allowed and encouraged in public prose;
 * it is the one documented exception to the omission rule.
 */
const PUBLIC_EXCEPTIONS = [/slop\s+machine/i];

function fail(message) {
  console.error(`[ERROR] ${message}`);
  process.exit(1);
}

function skip(reason) {
  console.log(`[SKIP] Public vocabulary scan skipped: ${reason}`);
  console.log('[SKIP] This is expected for a contributor without the private source.');
  process.exit(0);
}

function resolvePrivateSource() {
  const fromEnv = process.env.PRIVATE_VOCABULARY_FILE;
  if (fromEnv) {
    if (!existsSync(fromEnv)) {
      fail(`PRIVATE_VOCABULARY_FILE is set to ${fromEnv} but that file does not exist.`);
    }
    return fromEnv;
  }
  const sibling = resolve(repoRoot, '..', 'agent-global-memory', 'PERSONAL_VOCABULARY.json');
  return existsSync(sibling) ? sibling : null;
}

function loadTerms(sourcePath) {
  let parsed;
  try {
    parsed = JSON.parse(readFileSync(sourcePath, 'utf8'));
  } catch (error) {
    fail(`Could not read the private vocabulary source: ${error.message}`);
  }
  if (!parsed || parsed.schemaVersion !== 1 || typeof parsed.entries !== 'object') {
    fail('The private vocabulary source must be schemaVersion 1 with an "entries" object.');
  }
  // Values are the private wording; keys are the ordinary words they replace.
  const terms = Object.values(parsed.entries)
    .filter((value) => typeof value === 'string' && value.trim().length >= 3)
    .map((value) => value.trim());
  if (terms.length === 0) {
    fail('The private vocabulary source resolved to zero usable terms.');
  }
  return [...new Set(terms)];
}

function trackedFiles() {
  const output = execFileSync('git', ['ls-files', '-z'], {
    cwd: repoRoot,
    maxBuffer: 256 * 1024 * 1024,
    encoding: 'utf8',
  });
  return output
    .split('\0')
    .filter(Boolean)
    .filter((path) => isOverlayFile(path) || !SKIPPED_PREFIXES.some((prefix) => path.startsWith(prefix)));
}

const REGEXP_SPECIALS = new Set(['.', '*', '+', '?', '^', '$', '{', '}', '(', ')', '|', '[', ']', '\\', '/', '-']);

function escapeRegExp(value) {
  let escaped = '';
  for (const character of value) {
    if (REGEXP_SPECIALS.has(character)) escaped += '\\';
    escaped += character;
  }
  return escaped;
}

/**
 * Word-bounded so a short term cannot match inside an unrelated identifier,
 * and whitespace-tolerant so a multi-word term still matches across a line
 * break in wrapped prose.
 */
function buildMatcher(term) {
  const WHITESPACE_RUN = String.raw`\s+`;
  const pattern = term.split(/\s+/).map(escapeRegExp).join(WHITESPACE_RUN);
  return new RegExp(`(?<![A-Za-z0-9])${pattern}(?![A-Za-z0-9])`, 'i');
}

const sourcePath = resolvePrivateSource();
if (!sourcePath) {
  skip('no private vocabulary source was found');
}

const terms = loadTerms(sourcePath);
const matchers = terms.map((term) => ({
  matcher: buildMatcher(term),
  multiWord: /\s/.test(term),
}));
const everywhereMatchers = matchers.filter((entry) => entry.multiWord);

if (everywhereMatchers.length === 0) {
  fail('No multi-word terms resolved; the scan would only cover overlay files.');
}

const files = trackedFiles();
const hits = [];

for (const file of files) {
  // An overlay file gets the full term list; imported GitLab source gets only
  // the distinctive multi-word terms. See OVERLAY_PREFIXES for why.
  const active = isOverlayFile(file) ? matchers : everywhereMatchers;
  const absolute = join(repoRoot, file);

  // The path itself is published, so a filename carrying a term is a hit.
  const pathWords = file.replace(/[/\-_.]/g, ' ');
  for (const { matcher } of active) {
    if (matcher.test(pathWords)) {
      hits.push({ file, line: 0, where: 'path' });
      break;
    }
  }

  let contents;
  try {
    contents = readFileSync(absolute, 'utf8');
  } catch {
    continue; // Binary, deleted, or unreadable: nothing textual to publish.
  }
  if (contents.includes('\0')) continue;

  const lines = contents.split(/\r?\n/);
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    if (PUBLIC_EXCEPTIONS.some((exception) => exception.test(line))) continue;
    for (const { matcher } of active) {
      if (matcher.test(line)) {
        hits.push({ file, line: index + 1, where: 'content' });
        break;
      }
    }
  }
}

if (hits.length > 0) {
  console.error(`[ERROR] Internal shorthand found in ${hits.length} place(s) in published files.`);
  console.error('[ERROR] The offending terms are NOT printed here, because this output is itself');
  console.error('[ERROR] published in CI logs. Open each location below and read it.');
  for (const hit of hits.slice(0, 100)) {
    console.error(`  - ${hit.file}${hit.line ? `:${hit.line}` : ''} (${hit.where})`);
  }
  if (hits.length > 100) console.error(`  ... and ${hits.length - 100} more.`);
  process.exit(1);
}

console.log(`[OK] Public vocabulary scan clean: ${files.length} tracked files; ${terms.length} terms in overlay files, ${everywhereMatchers.length} multi-word terms everywhere.`);
