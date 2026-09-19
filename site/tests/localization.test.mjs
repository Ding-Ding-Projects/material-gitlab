import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { getContent, getFieldSpec, CONTENT_CATALOG, TEXT_FIELD_SPECS } from '../src/content.js';
import { contentParts, normalizeLanguage } from '../src/localization.js';
import { DEFAULT_PREFERENCES, normalizePreferences, loadPreferences, savePreferences, PREFERENCES_STORAGE_KEY } from '../src/preferences.js';

const pair = Object.freeze({ en: 'Search pages', 'zh-Hant': '搜尋頁面' });

test('bilingual content includes both languages in English-first order', () => {
  assert.equal(getContent(pair, 'bilingual'), 'Search pages / 搜尋頁面');
  assert.deepEqual(contentParts(pair, 'bilingual').map(({ lang }) => lang), ['en', 'yue']);
});

for (const mode of ['zh-Hant', 'zh-HK', 'yue', 'yue-HK', 'yue-Hant-HK']) {
  test(`${mode} resolves to the Cantonese track without changing persisted keys`, () => {
    assert.equal(normalizeLanguage(mode), 'zh-Hant');
    assert.equal(getContent(pair, mode), '搜尋頁面');
  });
}

test('English and unknown modes use English', () => {
  for (const mode of ['en', 'unknown', null, undefined]) assert.equal(getContent(pair, mode), 'Search pages');
});

test('missing translation falls back without duplicating copy', () => {
  assert.equal(getContent({ en: 'Search' }, 'bilingual'), 'Search');
  assert.equal(getContent({ en: 'Search' }, 'yue'), 'Search');
  assert.equal(getContent({ yue: '搜尋' }, 'en'), '搜尋');
  assert.deepEqual(contentParts({ en: 'GitLab', 'zh-Hant': 'GitLab' }, 'bilingual'), [{ lang: 'en', text: 'GitLab' }]);
});

test('explicit empty translations stay empty', () => {
  assert.equal(getContent({ en: 'Search', 'zh-Hant': '' }, 'yue'), '');
  assert.equal(getContent({ en: '', 'zh-Hant': '' }, 'bilingual'), '');
});

test('invalid and inherited catalog entries are not rendered as objects', () => {
  assert.equal(getContent({ en: { invalid: true } }), '');
  assert.equal(getContent(Object.create({ en: 'inherited' })), '');
  assert.equal(getFieldSpec('__proto__'), null);
  assert.equal(getFieldSpec('not-present'), null);
});

test('raw technical strings and external records stay unchanged', () => {
  for (const value of ['git push origin main', '/project/README.md', 'https://example.test/a', '<strong>literal</strong>']) {
    for (const mode of ['en', 'zh-Hant', 'bilingual']) assert.equal(getContent(value, mode), value);
  }
});

test('all catalog entries with English copy have a Cantonese counterpart', () => {
  function visit(value) {
    if (!value || typeof value !== 'object') return;
    if (Object.hasOwn(value, 'en')) {
      assert.equal(typeof value.en, 'string');
      assert.equal(typeof value['zh-Hant'], 'string');
      assert.equal(getContent(value, 'bilingual'), [...new Set([value.en, value['zh-Hant']])].filter(Boolean).join(' / '));
    } else Object.values(value).forEach(visit);
  }
  visit(CONTENT_CATALOG);
  visit(TEXT_FIELD_SPECS);
});

test('new site preferences default both independent levels to five', () => {
  assert.equal(DEFAULT_PREFERENCES.funnyLevelEnglish, 5);
  assert.equal(DEFAULT_PREFERENCES.funnyLevelCantonese, 5);
  assert.deepEqual(normalizePreferences(), DEFAULT_PREFERENCES);
});

for (const language of ['en', 'zh-Hant', 'bilingual']) {
  test(`${language}: all independent saved level combinations survive reload`, () => {
    const records = new Map();
    const storage = { getItem: (key) => records.get(key) ?? null, setItem: (key, value) => records.set(key, value) };
    for (let english = 1; english <= 5; english += 1) {
      for (let cantonese = 1; cantonese <= 5; cantonese += 1) {
        savePreferences({ language, funnyLevelEnglish: english, funnyLevelCantonese: cantonese }, storage);
        const loaded = loadPreferences(storage);
        assert.equal(loaded.language, language);
        assert.equal(loaded.funnyLevelEnglish, english);
        assert.equal(loaded.funnyLevelCantonese, cantonese);
      }
    }
  });
}

test('missing and corrupt settings recover without persisting replacements', () => {
  let writes = 0;
  for (const raw of [null, '{broken', 'null']) {
    const storage = { getItem: (key) => key === PREFERENCES_STORAGE_KEY ? raw : null, setItem: () => { writes += 1; } };
    assert.deepEqual(loadPreferences(storage), DEFAULT_PREFERENCES);
  }
  assert.equal(writes, 0);
});

test('Material defaults also declare five for each language', async () => {
  const source = await readFile(new URL('../../app/assets/javascripts/material_system/settings.js', import.meta.url), 'utf8');
  assert.match(source, /funnyLevelEnglish: 5,/);
  assert.match(source, /funnyLevelCantonese: 5,/);
});
