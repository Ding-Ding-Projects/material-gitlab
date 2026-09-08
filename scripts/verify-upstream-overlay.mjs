#!/usr/bin/env node

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = resolve(fileURLToPath(new URL('..', import.meta.url)));
const manifestPath = resolve(repoRoot, 'upstream-overlay.json');

function fail(message) {
  console.error(`[ERROR] ${message}`);
  process.exit(1);
}

let manifest;
try {
  manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
} catch (error) {
  fail(`Could not read ${manifestPath}: ${error.message}`);
}

const upstreamRepo = manifest.official_upstream_repository;
const upstreamCommit = manifest.official_upstream_commit;

if (typeof upstreamRepo !== 'string' || !upstreamRepo.startsWith('https://gitlab.com/gitlab-org/gitlab')) {
  fail('The official upstream repository must be the GitLab canonical repository URL.');
}

if (!/^[0-9a-f]{40}$/i.test(upstreamCommit || '')) {
  fail('The official upstream commit must be a full 40-character SHA-1.');
}

console.log(`[OK] Upstream overlay provenance is pinned to ${upstreamRepo} @ ${upstreamCommit}.`);
