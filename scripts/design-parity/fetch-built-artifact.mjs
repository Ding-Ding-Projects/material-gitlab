#!/usr/bin/env node
// Download the packaged fork from a GitHub release and write the artifact manifest that
// built-side design-parity receipts bind to.
//
//   node scripts/design-parity/fetch-built-artifact.mjs \
//     --tag omnibus-19.3.0-pre-<sha12> --commit <40-character sha> \
//     [--repo Ding-Ding-Projects/material-gitlab] \
//     [--out artifacts/parity/_local] \
//     [--manifest artifacts/parity/built-artifact-manifest.json]
//
// The receipts contract (tools/design-reference/scripts/capture.mjs) requires a
// source-commit-bound manifest whose artifact hash is verified against a real local file.
// A 1.4 GB package cannot live in Git, so this script fetches it into an ignored directory,
// checks it against the release's own SHA256SUMS.txt, and records the digest, size, release
// tag and asset URL in a small committed manifest. Anyone re-running the strict guard runs
// this script first; the guard then verifies the same bytes.
//
// It refuses a draft release, a release whose target commit differs from --commit, and any
// digest mismatch. It uses the gh CLI for release metadata and download.

import { execFileSync } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

function arg(name, fallback) {
  const prefix = `--${name}=`;
  const found = process.argv.find((item) => item.startsWith(prefix));
  return found ? found.slice(prefix.length) : fallback;
}

function fail(message) {
  console.error(`fetch-built-artifact: ${message}`);
  process.exit(1);
}

function gh(args) {
  return execFileSync('gh', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'inherit'] });
}

function sha256(file) {
  const hash = crypto.createHash('sha256');
  const stream = fs.readFileSync(file);
  hash.update(stream);
  return hash.digest('hex');
}

const tag = arg('tag');
const commit = arg('commit');
const repo = arg('repo', 'Ding-Ding-Projects/material-gitlab');
const outDir = path.resolve(ROOT, arg('out', 'artifacts/parity/_local'));
const manifestPath = path.resolve(ROOT, arg('manifest', 'artifacts/parity/built-artifact-manifest.json'));

if (!tag) fail('--tag is required');
if (!/^[a-f0-9]{40}$/.test(commit || '')) fail('--commit must be a 40-character commit sha');

const release = JSON.parse(gh(['release', 'view', tag, '--repo', repo, '--json', 'tagName,isDraft,targetCommitish,url,assets']));
if (release.isDraft) fail(`release ${tag} is a draft`);
if (release.targetCommitish !== commit) fail(`release ${tag} targets ${release.targetCommitish}, not ${commit}`);
const debAsset = release.assets.find((asset) => asset.name.endsWith('.deb'));
const sumsAsset = release.assets.find((asset) => asset.name === 'SHA256SUMS.txt');
if (!debAsset || !sumsAsset) fail(`release ${tag} lacks a .deb or SHA256SUMS.txt asset`);

fs.mkdirSync(outDir, { recursive: true });
gh(['release', 'download', tag, '--repo', repo, '--pattern', '*.deb', '--pattern', 'SHA256SUMS.txt', '--dir', outDir, '--clobber']);

const debPath = path.join(outDir, debAsset.name);
const sumsPath = path.join(outDir, 'SHA256SUMS.txt');
if (!fs.existsSync(debPath) || !fs.existsSync(sumsPath)) fail('download did not produce both files');

const expected = fs.readFileSync(sumsPath, 'utf8')
  .split(/\r?\n/)
  .map((line) => line.trim().split(/\s+/))
  .find((parts) => parts.length === 2 && parts[1] === debAsset.name);
if (!expected) fail(`SHA256SUMS.txt does not list ${debAsset.name}`);

const actual = sha256(debPath);
if (actual !== expected[0]) fail(`digest mismatch for ${debAsset.name}: release says ${expected[0]}, file is ${actual}`);
const bytes = fs.statSync(debPath).size;
if (bytes !== debAsset.size) fail(`size mismatch for ${debAsset.name}: release says ${debAsset.size}, file is ${bytes}`);

const manifest = {
  schemaVersion: 1,
  sourceCommit: commit,
  release: { repository: repo, tag: release.tagName, url: release.url },
  artifacts: [
    {
      path: path.relative(ROOT, debPath).split(path.sep).join('/'),
      name: debAsset.name,
      sha256: actual,
      bytes,
      downloadUrl: debAsset.url,
    },
  ],
};
fs.mkdirSync(path.dirname(manifestPath), { recursive: true });
fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);

console.log(JSON.stringify({
  status: 'verified',
  tag: release.tagName,
  commit,
  artifact: manifest.artifacts[0].path,
  sha256: actual,
  bytes,
  manifest: path.relative(ROOT, manifestPath).split(path.sep).join('/'),
}, null, 2));
