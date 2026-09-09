#!/usr/bin/env node
import { access, readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (relative) => readFile(path.join(root, relative), 'utf8');
const requiredSourceMarkers = Object.freeze([
  'data-display-name-input', 'data-school-toggle', 'data-narrator-english-voice', 'data-narrator-cantonese-voice',
  'data-settings-regex-builder', 'data-super-confirmation', 'data-download-start-dialog',
  'data-download-active-dialog', 'data-download-complete-dialog', 'data-vocabulary-clear',
]);

async function failures(overrides = {}) {
  const result = [];
  const index = overrides.index ?? await read('index.html');
  const runtime = overrides.runtime ?? await read('src/universal-runtime.js');
  const config = overrides.config ?? await read('vite.config.js');
  const docs = JSON.parse(overrides.docs ?? await read('data/docs-manifest.json'));
  const locales = JSON.parse(overrides.locales ?? await read('data/locales.json'));
  for (const marker of requiredSourceMarkers) if (!index.includes(marker)) result.push(`index is missing ${marker}`);
  if (!runtime.includes('createRegexBuilder') || !runtime.includes('querySelectorAll(\'select\')')) result.push('dropdown filters must own full regex builders');
  if (!runtime.includes('contextmenu') || !runtime.includes('data-context-builder')) result.push('context menus must own a regex builder');
  if (!config.includes("base: './'")) result.push('Vite base must be relative');
  if (!Array.isArray(docs.documents) || docs.documents.length !== 29) result.push('docs manifest must contain 29 bundled articles');
  for (const article of docs.documents || []) {
    if (article.availability !== 'bundled') result.push(`article ${article.id} is not bundled`);
    try { await access(path.join(root, article.path)); } catch { result.push(`article path is missing: ${article.path}`); }
  }
  if (JSON.stringify(locales.languages) !== JSON.stringify(['en', 'zh-Hant', 'bilingual'])) result.push('locale modes are incomplete');
  if (/(?:<script|<link|<img)[^>]+(?:src|href)=["']https?:/i.test(index)) result.push('site embeds a remote script, stylesheet, or image');
  if (!index.includes('name="viewport"')) result.push('viewport metadata is missing');
  const builtPath = path.join(root, 'dist', 'index.html');
  try {
    const built = await readFile(builtPath, 'utf8');
    if (/(?:src|href)="\/(?:assets|src)\//.test(built)) result.push('built asset paths are absolute instead of subpath-safe');
    try { await access(path.join(root, 'dist', 'data', 'universal-features.json')); } catch { result.push('built universal feature inventory is missing'); }
    for (const article of docs.documents || []) {
      try { await access(path.join(root, 'dist', article.path)); } catch { result.push(`built article is missing: ${article.path}`); }
    }
  } catch { /* a source-only run may precede the first build */ }
  return result;
}

const negativeOnly = process.argv.includes('--negative-only');
if (!negativeOnly) {
  const baseline = await failures();
  if (baseline.length) { console.error('Site contract gate failed:'); baseline.forEach((failure) => console.error(`- ${failure}`)); process.exitCode = 1; }
}
const index = await read('index.html');
const runtime = await read('src/universal-runtime.js');
const config = await read('vite.config.js');
const mutations = [
  ['settings marker removal', { index: index.replace('data-settings-regex-builder', 'data-settings-builder-removed') }],
  ['dropdown regex removal', { runtime: runtime.replaceAll('createRegexBuilder', 'removedBuilder') }],
  ['relative base removal', { config: config.replace("base: './'", "base: '/'") }],
];
let escaped = 0;
for (const [label, override] of mutations) if ((await failures(override)).length === 0) { console.error(`Negative regression escaped: ${label}`); escaped += 1; }
if (escaped) process.exitCode = 1;
else if (!process.exitCode) console.log('Site contract gate passed: source, bundled docs, localization, subpath build, and 3 negative regressions verified.');
