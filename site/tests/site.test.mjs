import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeUniversalState, hashCredential, shouldShowDimSum, validateDownloadRequest, filterOptions } from '../src/universal-runtime.js';
import { normalizePreferences, validateVocabularyPayload } from '../src/preferences.js';
import { createTabState, createGroup, moveTabToGroup, setSearch, searchTabs, togglePin } from '../src/tabs.js';
import { evaluateRegex } from '../src/regex-builder.js';
import { normalizeRule, ruleMatches, resolveScheduledValues } from '../src/scheduled-settings.js';
import { buildAdapterCatalog, findAdapters, createConversionQueue } from '../src/file-converter.js';
import { createOllamaManager } from '../src/ollama-manager.js';

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
