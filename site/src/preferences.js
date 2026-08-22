/**
 * Local preference and personal-vocabulary state for the documentation site.
 * No network calls are made and vocabulary values are never bundled here.
 */

export const PREFERENCES_SCHEMA_VERSION = 1;
export const VOCABULARY_SCHEMA_VERSION = 1;
export const PREFERENCES_STORAGE_KEY = 'material-gitlab.preferences.v1';
export const VOCABULARY_STORAGE_KEY = 'material-gitlab.personal-vocabulary.v1';
export const MAX_VOCABULARY_BYTES = 128 * 1024;
export const MAX_VOCABULARY_ENTRIES = 500;
export const MAX_VOCABULARY_TEXT_LENGTH = 200;

export const DEFAULT_PREFERENCES = Object.freeze({
  schemaVersion: PREFERENCES_SCHEMA_VERSION,
  language: 'en',
  funnyLevelEnglish: 1,
  funnyLevelCantonese: 1,
  showEmojis: true,
  theme: 'light',
  density: 'standard',
  accentColor: '#6750a4',
});

const LANGUAGES = new Set(['en', 'zh-Hant', 'bilingual']);
const THEMES = new Set(['light', 'dark']);
const DENSITIES = new Set(['compact', 'standard', 'comfortable']);
const UNSAFE_KEYS = new Set(['__proto__', 'prototype', 'constructor']);

function storageOf(storage) {
  if (storage) return storage;
  try { return globalThis.localStorage; } catch { return null; }
}

function integerLevel(value, fallback) {
  const number = Number(value);
  return Number.isInteger(number) && number >= 1 && number <= 5 ? number : fallback;
}

export function normalizePreferences(value = {}) {
  const source = value && typeof value === 'object' ? value : {};
  return {
    ...DEFAULT_PREFERENCES,
    schemaVersion: PREFERENCES_SCHEMA_VERSION,
    language: LANGUAGES.has(source.language) ? source.language : DEFAULT_PREFERENCES.language,
    funnyLevelEnglish: integerLevel(source.funnyLevelEnglish, DEFAULT_PREFERENCES.funnyLevelEnglish),
    funnyLevelCantonese: integerLevel(source.funnyLevelCantonese, DEFAULT_PREFERENCES.funnyLevelCantonese),
    showEmojis: typeof source.showEmojis === 'boolean' ? source.showEmojis : DEFAULT_PREFERENCES.showEmojis,
    theme: THEMES.has(source.theme) ? source.theme : DEFAULT_PREFERENCES.theme,
    density: DENSITIES.has(source.density) ? source.density : DEFAULT_PREFERENCES.density,
    accentColor: typeof source.accentColor === 'string' && /^#[0-9a-f]{6}$/i.test(source.accentColor) ? source.accentColor.toLowerCase() : DEFAULT_PREFERENCES.accentColor,
  };
}

export function loadPreferences(storage) {
  const store = storageOf(storage);
  if (!store) return { ...DEFAULT_PREFERENCES };
  try { return normalizePreferences(JSON.parse(store.getItem(PREFERENCES_STORAGE_KEY) || '{}')); }
  catch { return { ...DEFAULT_PREFERENCES }; }
}

export function savePreferences(next, storage) {
  const store = storageOf(storage);
  const normalized = normalizePreferences(next);
  if (store) {
    try { store.setItem(PREFERENCES_STORAGE_KEY, JSON.stringify(normalized)); } catch { /* private storage may be unavailable */ }
  }
  return normalized;
}

export function updatePreferences(patch, storage) {
  return savePreferences({ ...loadPreferences(storage), ...(patch || {}) }, storage);
}

export function subscribePreferences(listener, target = globalThis) {
  if (!target?.addEventListener) return () => {};
  const handler = (event) => {
    if (event.key !== PREFERENCES_STORAGE_KEY) return;
    listener(loadPreferences(target.localStorage), event);
  };
  target.addEventListener('storage', handler);
  return () => target.removeEventListener('storage', handler);
}

function byteLength(value) {
  return new TextEncoder().encode(value).byteLength;
}

function validateVocabularyObject(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Vocabulary must be a JSON object.');
  if (value.schemaVersion !== VOCABULARY_SCHEMA_VERSION) throw new Error('Unsupported vocabulary schema version.');
  if (!value.entries || typeof value.entries !== 'object' || Array.isArray(value.entries)) throw new Error('Vocabulary entries must be an object.');
  const keys = Object.keys(value.entries);
  if (keys.length > MAX_VOCABULARY_ENTRIES) throw new Error('Vocabulary contains too many entries.');
  const entries = {};
  for (const key of keys) {
    if (!key || key.length > MAX_VOCABULARY_TEXT_LENGTH || UNSAFE_KEYS.has(key)) throw new Error('Vocabulary contains an unsafe or oversized key.');
    const replacement = value.entries[key];
    if (typeof replacement !== 'string' || replacement.length > MAX_VOCABULARY_TEXT_LENGTH) throw new Error('Vocabulary replacements must be bounded strings.');
    entries[key] = replacement;
  }
  return { schemaVersion: VOCABULARY_SCHEMA_VERSION, entries };
}

export function validateVocabularyPayload(payload) {
  const text = typeof payload === 'string' ? payload : JSON.stringify(payload);
  if (byteLength(text) > MAX_VOCABULARY_BYTES) throw new Error('Vocabulary file exceeds the size limit.');
  let parsed;
  try { parsed = JSON.parse(text); } catch { throw new Error('Vocabulary file is not valid JSON.'); }
  return validateVocabularyObject(parsed);
}

export async function readVocabularyFile(file) {
  if (!file || typeof file.text !== 'function') throw new Error('Choose a local JSON file.');
  const text = await file.text();
  return validateVocabularyPayload(text);
}

export function loadVocabularyCache(storage) {
  const store = storageOf(storage);
  if (!store) return null;
  try {
    const raw = store.getItem(VOCABULARY_STORAGE_KEY);
    return raw ? validateVocabularyPayload(raw) : null;
  } catch { return null; }
}

export function cacheVocabulary(value, storage) {
  const normalized = validateVocabularyPayload(value);
  const store = storageOf(storage);
  if (store) {
    try { store.setItem(VOCABULARY_STORAGE_KEY, JSON.stringify(normalized)); } catch { throw new Error('Unable to cache vocabulary locally.'); }
  }
  return normalized;
}

export function clearVocabularyCache(storage) {
  const store = storageOf(storage);
  try { store?.removeItem(VOCABULARY_STORAGE_KEY); } catch { /* clearing is best effort */ }
  return null;
}

export function vocabularyStatus(storage) {
  const vocabulary = loadVocabularyCache(storage);
  return vocabulary ? { state: 'loaded', entryCount: Object.keys(vocabulary.entries).length } : { state: 'empty', entryCount: 0 };
}

export default {
  loadPreferences, savePreferences, updatePreferences, subscribePreferences,
  validateVocabularyPayload, readVocabularyFile, loadVocabularyCache, cacheVocabulary,
  clearVocabularyCache, vocabularyStatus,
};
