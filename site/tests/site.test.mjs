import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeUniversalState, hashCredential, shouldShowDimSum, validateDownloadRequest, filterOptions } from '../src/universal-runtime.js';
import { normalizePreferences, validateVocabularyPayload } from '../src/preferences.js';
import { createTabState, createGroup, moveTabToGroup, setSearch, searchTabs, togglePin } from '../src/tabs.js';
import { evaluateRegex } from '../src/regex-builder.js';
import { normalizeRule, ruleMatches, resolveScheduledValues } from '../src/scheduled-settings.js';
import { buildAdapterCatalog, findAdapters, createConversionQueue } from '../src/file-converter.js';
import { createOllamaManager } from '../src/ollama-manager.js';
import { markdownToHtml, articleHasOwnTitle, escapeHtml } from '../src/markdown.js';
import {
  renderReleaseCard,
  validateReleaseManifest,
  formatBytes,
  shortCommit,
  buildPackageCommands,
  buildDockerCommands,
  EMPTY_INSTALL_MESSAGE,
  INVALID_MANIFEST_MESSAGE,
  RELEASES_PAGE_URL,
} from '../src/releases.js';

test('universal state is bounded and preserves only supported values', () => {
  const state = normalizeUniversalState({ displayName: 'X'.repeat(200), school: { enabled: true, name: 'Quiet' }, narrator: { language: 'both', rate: 9, pitch: -4 }, download: { state: 'complete', bytes: 12 } });
  assert.equal(state.displayName.length, 80);
  assert.equal(state.school.enabled, true);
  assert.equal(state.narrator.language, 'both');
  assert.equal(state.narrator.rate, 2);
  assert.equal(state.narrator.pitch, 0);
  assert.equal(state.download.state, 'complete');
});

test('local credential verifier is deterministic without retaining plaintext', async () => {
  const first = await hashCredential('local-only-value');
  const second = await hashCredential('local-only-value');
  assert.match(first, /^[a-f0-9]{64}$/);
  assert.equal(first, second);
  assert.rejects(() => hashCredential('x'), /between 4 and 256 bytes/);
});

test('dim-sum draw has exact boundary and respects busy states', () => {
  assert.equal(shouldShowDimSum(0), true);
  assert.equal(shouldShowDimSum(0.099999), true);
  assert.equal(shouldShowDimSum(0.1), false);
  assert.equal(shouldShowDimSum(0.05, true, false), false);
  assert.equal(shouldShowDimSum(0.05, false, true), false);
});

test('download request rejects missing or unbounded fields', () => {
  assert.deepEqual(validateDownloadRequest({ filename: 'state.json', source: 'local capture' }), { filename: 'state.json', source: 'local capture', destination: 'Browser downloads' });
  assert.throws(() => validateDownloadRequest({ filename: '', source: 'x' }), /bounded filename/);
  assert.throws(() => validateDownloadRequest({ filename: 'x', source: '' }), /source/);
});

test('option filter supports plain text and reports invalid regex', () => {
  const options = [{ textContent: 'English' }, { textContent: 'Cantonese' }];
  assert.deepEqual(filterOptions(options, 'eng').matches, [options[0]]);
  assert.deepEqual(filterOptions(options, '^Can', { regex: true }).matches, [options[1]]);
  assert.match(filterOptions(options, '[', { regex: true }).error, /unterminated|invalid|class/i);
});

test('preferences and private vocabulary fail closed', () => {
  assert.equal(normalizePreferences({ language: 'unknown', funnyLevelEnglish: 9 }).language, 'en');
  assert.equal(normalizePreferences({ funnyLevelEnglish: 9 }).funnyLevelEnglish, 1);
  assert.deepEqual(validateVocabularyPayload({ schemaVersion: 1, entries: { hello: 'world' } }).entries, { hello: 'world' });
  assert.throws(() => validateVocabularyPayload({ schemaVersion: 2, entries: {} }), /Unsupported/);
  assert.throws(() => validateVocabularyPayload('{"schemaVersion":1,"entries":{"__proto__":"x"}}'), /unsafe|object/i);
});

test('tab state keeps four independent searches, groups and protected pinning', () => {
  let state = createTabState({ tabs: [{ id: 'a', label: 'Alpha' }, { id: 'b', label: 'Beta' }] });
  state = createGroup(state, { id: 'g', label: 'Group' });
  state = moveTabToGroup(state, 'b', 'g');
  state = togglePin(state, 'a', true);
  state = setSearch(state, 'master', { query: 'beta' });
  assert.equal(state.searches.strip.query, '');
  assert.equal(searchTabs(state, 'master')[0].id, 'b');
  assert.equal(state.tabs[0].pinned, true);
  assert.equal(state.tabs[1].groupId, 'g');
});

test('regex evaluator handles captures, invalid input and zero-width matches', () => {
  const captured = evaluateRegex('(Git)(Lab)', 'g', 'GitLab');
  assert.equal(captured.ok, true);
  assert.deepEqual(captured.captures[0].slice(1), ['Git', 'Lab']);
  assert.equal(evaluateRegex('[', 'g', 'x').ok, false);
  assert.ok(evaluateRegex('(?=a)', 'g', 'aaa').matches.length <= 3);
});

test('scheduled rules resolve deterministic values and date boundaries', () => {
  const monday = new Date('2026-08-10T12:00:00');
  const rule = normalizeRule({ id: 'focus', enabled: true, weekdays: [1], startTime: '09:00', endTime: '17:00', values: { theme: 'dark' }, priority: 2 });
  assert.equal(ruleMatches(rule, monday), true);
  assert.deepEqual(resolveScheduledValues({ version: 1, rules: [rule] }, monday), { theme: 'dark' });
});

test('converter catalog exposes bundled and unavailable adapters honestly', async () => {
  const catalog = buildAdapterCatalog([{ id: 'json', category: 'Structured Data/Spreadsheets', sourceMime: ['application/json'], targetMime: ['application/json'], bundled: true }, { id: 'pdf', category: 'Documents/PDF', sourceMime: ['application/pdf'], targetMime: ['application/pdf'], bundled: false, reason: 'not bundled' }]);
  assert.equal(findAdapters(catalog, 'application/json').length, 1);
  assert.equal(findAdapters(catalog, 'application/pdf').length, 0);
  const events = [];
  const queue = createConversionQueue([{ id: 'a' }, { id: 'b' }], { concurrency: 1, onProgress: (event) => events.push(event) });
  await queue.run(async (item) => item.id.toUpperCase());
  assert.equal(events.filter((event) => event.state === 'converted').length, 2);
});

test('Ollama manager distinguishes unavailable transport and evidence-backed fit', async () => {
  const missing = createOllamaManager();
  assert.equal((await missing.checkHealth()).state, 'unhealthy');
  const manager = createOllamaManager({ transport: { health: async () => ({ version: '1.0' }) } });
  assert.equal((await manager.checkHealth()).state, 'healthy');
  assert.equal(manager.fitVerdict({ sizeBytes: 1 }, {}), 'Unknown');
});

function buildVerifiedReleaseManifest() {
  const commit = 'b'.repeat(40);
  const sha12 = commit.slice(0, 12);
  const tag = `omnibus-19.3.0-pre-${sha12}`;
  const releaseUrl = `https://github.com/Ding-Ding-Projects/material-gitlab/releases/tag/${tag}`;
  const sha256 = 'a'.repeat(64);
  const asset = {
    name: 'gitlab-ce_19.3.0-pre_amd64.deb',
    url: `https://github.com/Ding-Ding-Projects/material-gitlab/releases/download/${tag}/gitlab-ce_19.3.0-pre_amd64.deb`,
    sha256,
    bytes: 432000000,
  };
  const verified = { by: 'test harness', at: '2026-09-09T00:00:00Z', method: 'unit test fixture' };
  const digest = `ghcr.io/ding-ding-projects/material-gitlab@sha256:${'c'.repeat(64)}`;
  return {
    schemaVersion: 1,
    updatedAt: '2026-09-09T00:00:00Z',
    entries: [
      { kind: 'omnibus-package', version: '19.3.0-pre', commit, tag, releaseUrl, assets: [asset], image: null, verified },
      {
        kind: 'container-image',
        version: '19.3.0-pre',
        commit,
        tag,
        releaseUrl,
        assets: [],
        image: { reference: `ghcr.io/ding-ding-projects/material-gitlab:${tag.replace('omnibus-', '')}`, digest },
        verified,
      },
    ],
  };
}

test('release manifest validation accepts a well-formed manifest and fails closed on every malformed shape', () => {
  const manifest = buildVerifiedReleaseManifest();
  assert.equal(validateReleaseManifest(manifest).ok, true);
  assert.equal(validateReleaseManifest(null).ok, false);
  assert.match(validateReleaseManifest(null).reason, /object/);
  assert.match(validateReleaseManifest({ schemaVersion: 2, updatedAt: manifest.updatedAt, entries: [] }).reason, /schemaVersion/);
  assert.match(validateReleaseManifest({ schemaVersion: 1, updatedAt: manifest.updatedAt, entries: 'nope' }).reason, /entries must be an array/);
  const badSha = JSON.parse(JSON.stringify(manifest));
  badSha.entries[0].assets[0].sha256 = 'not-a-hash';
  assert.match(validateReleaseManifest(badSha).reason, /sha256/);
  const missingDeb = JSON.parse(JSON.stringify(manifest));
  missingDeb.entries[0].assets = [];
  assert.match(validateReleaseManifest(missingDeb).reason, /\.deb/);
  const badDigest = JSON.parse(JSON.stringify(manifest));
  badDigest.entries[1].image.digest = 'sha256:zzzz';
  assert.match(validateReleaseManifest(badDigest).reason, /digest/);
  const imageOnPackage = JSON.parse(JSON.stringify(manifest));
  imageOnPackage.entries[0].image = { reference: 'x', digest: 'y' };
  assert.match(validateReleaseManifest(imageOnPackage).reason, /image must be null/);
});

test('the install card renders an honest empty state with no download control when the manifest has no entries', () => {
  const result = renderReleaseCard({ schemaVersion: 1, updatedAt: '2026-09-09T00:00:00Z', entries: [] });
  assert.equal(result.ok, true);
  assert.equal(result.reason, null);
  assert.ok(result.html.includes(EMPTY_INSTALL_MESSAGE));
  assert.ok(result.html.includes('data-install-state="empty"'));
  assert.ok(result.html.includes(RELEASES_PAGE_URL));
  assert.ok(!result.html.includes('data-install-download'));
  assert.ok(!result.html.includes('data-install-image-ref'));
});

test('the install card renders real controls whose URLs equal the manifest values for a verified entry', () => {
  const manifest = buildVerifiedReleaseManifest();
  const [packageEntry, imageEntry] = manifest.entries;
  const asset = packageEntry.assets[0];
  const result = renderReleaseCard(manifest);

  assert.equal(result.ok, true);
  assert.equal(result.reason, null);
  assert.ok(result.html.includes('data-install-state="available"'));
  assert.ok(result.html.includes(`href="${asset.url}"`));
  assert.ok(result.html.includes(asset.sha256));
  assert.ok(result.html.includes(`href="${packageEntry.releaseUrl}"`));
  assert.ok(result.html.includes(imageEntry.image.reference));
  assert.ok(result.html.includes(imageEntry.image.digest));
  assert.ok(result.html.includes(shortCommit(packageEntry.commit)));

  assert.deepEqual(buildPackageCommands(packageEntry), [
    `curl -fLo ${asset.name} '${asset.url}'`,
    `sudo EXTERNAL_URL="https://gitlab.example.internal" dpkg -i ${asset.name}`,
  ]);
  assert.deepEqual(buildDockerCommands(imageEntry), [
    `docker pull ${imageEntry.image.reference}`,
    'docker compose up -d',
  ]);
});

test('a malformed manifest fails closed to the no-download-control state and reports the reason', () => {
  const brokenEntries = renderReleaseCard({ schemaVersion: 1, updatedAt: '2026-09-09T00:00:00Z', entries: 'not-an-array' });
  assert.equal(brokenEntries.ok, false);
  assert.match(brokenEntries.reason, /entries must be an array/);
  assert.ok(brokenEntries.html.includes(INVALID_MANIFEST_MESSAGE));
  assert.ok(brokenEntries.html.includes('data-install-state="invalid"'));
  assert.ok(!brokenEntries.html.includes('data-install-download'));

  const brokenSchema = renderReleaseCard({ schemaVersion: 99, updatedAt: '', entries: [] });
  assert.equal(brokenSchema.ok, false);
  assert.match(brokenSchema.reason, /schemaVersion/);
  assert.ok(!brokenSchema.html.includes('data-install-download'));

  assert.equal(renderReleaseCard(null).ok, false);
  assert.ok(renderReleaseCard(undefined).html.includes(INVALID_MANIFEST_MESSAGE));
});

test('formatBytes and shortCommit produce deterministic, testable display values', () => {
  assert.equal(formatBytes(0), '0 B');
  assert.equal(formatBytes(999), '999 B');
  assert.equal(formatBytes(432000000), '432.0 MB');
  assert.equal(formatBytes(Number.NaN), 'unknown size');
  assert.equal(formatBytes(-5), 'unknown size');
  assert.equal(shortCommit('b'.repeat(40)), 'b'.repeat(12));
  assert.equal(shortCommit(), '');
});

test('an article that opens with its own top-level heading is detected so the viewer adds no second one', () => {
  assert.equal(articleHasOwnTitle('# Deployment\n\nBody.'), true);
  assert.equal(articleHasOwnTitle('\n\n# Deployment\n'), true);
  assert.equal(articleHasOwnTitle('Intro paragraph\n\n# Later heading'), false);
  assert.equal(articleHasOwnTitle(''), false);
  const html = markdownToHtml('# Deployment\n\nBody.');
  assert.equal((html.match(/<h2>/g) || []).length, 1);
});

test('inline links render as anchors only for http(s) and relative targets, and never for a script scheme', () => {
  const external = markdownToHtml('See [the README](https://example.test/repo#readme) now.');
  assert.match(external, /<a href="https:\/\/example\.test\/repo#readme" target="_blank" rel="noopener">the README<\/a>/);
  const relative = markdownToHtml('Read [the guide](docs/deployment.md).');
  assert.match(relative, /<a href="docs\/deployment\.md">the guide<\/a>/);
  const script = markdownToHtml('Bad [link](javascript:alert(1)) here.');
  assert.doesNotMatch(script, /<a /);
  assert.match(script, /\[link\]\(javascript:alert\(1\)\)/);
});

test('the renderer escapes markup before rendering so an article cannot inject HTML', () => {
  const html = markdownToHtml('Text with <script>alert(1)</script> and `code`.');
  assert.doesNotMatch(html, /<script>/);
  assert.match(html, /&lt;script&gt;/);
  assert.match(html, /<code>code<\/code>/);
  assert.equal(escapeHtml('a & b'), 'a &amp; b');
});
