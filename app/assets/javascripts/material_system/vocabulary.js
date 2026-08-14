export const VOCABULARY_SCHEMA_VERSION = 1;
export const VOCABULARY_STORAGE_KEY = 'material-system.personal-vocabulary.v1';
export const VOCABULARY_LIMITS = Object.freeze({
  bytes: 64 * 1024,
  depth: 8,
  entries: 512,
  key: 128,
  value: 512,
});

const UNSAFE_KEYS = new Set(['__proto__', 'constructor', 'prototype']);
const LANGUAGES = new Set(['en', 'yue']);
const encoder = typeof TextEncoder === 'undefined' ? null : new TextEncoder();
const clone = (value) => JSON.parse(JSON.stringify(value));
const byteLength = (value) =>
  encoder?.encode(value).byteLength ?? unescape(encodeURIComponent(value)).length;

function skipWhitespace(source, cursor) {
  let index = cursor;
  while (/\s/.test(source[index] || '')) index += 1;
  return index;
}

function readString(source, cursor) {
  if (source[cursor] !== '"') throw new Error(`Expected JSON string at byte ${cursor}`);
  let index = cursor + 1;
  let escaped = false;
  while (index < source.length) {
    const character = source[index];
    if (!escaped && character === '"') {
      const raw = source.slice(cursor, index + 1);
      return { value: JSON.parse(raw), cursor: index + 1 };
    }
    if (!escaped && character === '\\') escaped = true;
    else escaped = false;
    index += 1;
  }
  throw new Error('Unterminated JSON string');
}

function assertNoDuplicateKeys(source) {
  function parseValue(cursor, depth) {
    if (depth > VOCABULARY_LIMITS.depth)
      throw new Error('Vocabulary JSON exceeds maximum nesting depth');
    let index = skipWhitespace(source, cursor);
    if (source[index] === '{') return parseObject(index, depth + 1);
    if (source[index] === '[') return parseArray(index, depth + 1);
    if (source[index] === '"') return readString(source, index).cursor;
    const start = index;
    while (index < source.length && !/[\s,}\]]/.test(source[index])) index += 1;
    if (start === index) throw new Error(`Expected JSON value at byte ${index}`);
    return index;
  }

  function parseObject(cursor, depth) {
    const keys = new Set();
    let index = skipWhitespace(source, cursor + 1);
    if (source[index] === '}') return index + 1;
    while (index < source.length) {
      const token = readString(source, index);
      if (keys.has(token.value)) throw new Error(`Duplicate JSON key: ${token.value}`);
      keys.add(token.value);
      index = skipWhitespace(source, token.cursor);
      if (source[index] !== ':') throw new Error(`Expected colon at byte ${index}`);
      index = skipWhitespace(source, parseValue(index + 1, depth));
      if (source[index] === '}') return index + 1;
      if (source[index] !== ',') throw new Error(`Expected comma at byte ${index}`);
      index = skipWhitespace(source, index + 1);
    }
    throw new Error('Unterminated JSON object');
  }

  function parseArray(cursor, depth) {
    let index = skipWhitespace(source, cursor + 1);
    if (source[index] === ']') return index + 1;
    while (index < source.length) {
      index = skipWhitespace(source, parseValue(index, depth));
      if (source[index] === ']') return index + 1;
      if (source[index] !== ',') throw new Error(`Expected comma at byte ${index}`);
      index = skipWhitespace(source, index + 1);
    }
    throw new Error('Unterminated JSON array');
  }

  const cursor = skipWhitespace(source, parseValue(0, 0));
  if (cursor !== source.length) throw new Error(`Unexpected JSON content at byte ${cursor}`);
}

export function validateVocabularyPayload(payload, limits = VOCABULARY_LIMITS) {
  const errors = [];
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    return { ok: false, errors: ['vocabulary must be an object'] };
  }
  const allowedTopLevel = new Set(['schemaVersion', 'entries']);
  Object.keys(payload).forEach((key) => {
    if (!allowedTopLevel.has(key)) errors.push(`unexpected vocabulary field: ${key}`);
  });
  if (payload.schemaVersion !== VOCABULARY_SCHEMA_VERSION)
    errors.push('unsupported vocabulary schema version');
  if (!Array.isArray(payload.entries)) errors.push('entries must be an array');
  else if (payload.entries.length > limits.entries)
    errors.push(`entries exceed limit of ${limits.entries}`);

  const seen = new Set();
  (payload.entries || []).forEach((entry, index) => {
    const prefix = `entries[${index}]`;
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) {
      errors.push(`${prefix} must be an object`);
      return;
    }
    const allowedFields = new Set(['language', 'key', 'value']);
    Object.keys(entry).forEach((key) => {
      if (!allowedFields.has(key)) errors.push(`${prefix}: unexpected field ${key}`);
    });
    if (!LANGUAGES.has(entry.language)) errors.push(`${prefix}.language must be en or yue`);
    if (typeof entry.key !== 'string' || !entry.key.length || entry.key.length > limits.key)
      errors.push(`${prefix}.key must be 1-${limits.key} characters`);
    if (typeof entry.value !== 'string' || entry.value.length > limits.value)
      errors.push(`${prefix}.value must be a string of at most ${limits.value} characters`);
    if (UNSAFE_KEYS.has(entry.key)) errors.push(`${prefix}.key is unsafe`);
    const identity = `${entry.language}:${entry.key}`;
    if (seen.has(identity)) errors.push(`${prefix}: duplicate language/key entry`);
    seen.add(identity);
  });
  return errors.length ? { ok: false, errors } : { ok: true, value: clone(payload) };
}

export function parseVocabularyJson(source, limits = VOCABULARY_LIMITS) {
  if (typeof source !== 'string') return { ok: false, errors: ['vocabulary payload must be text'] };
  if (byteLength(source) > limits.bytes)
    return { ok: false, errors: [`vocabulary exceeds ${limits.bytes} bytes`] };
  try {
    assertNoDuplicateKeys(source);
    return validateVocabularyPayload(JSON.parse(source), limits);
  } catch (error) {
    return { ok: false, errors: [error.message || 'invalid vocabulary JSON'] };
  }
}

export function createPersonalVocabularyLoader({
  storage = globalThis.localStorage,
  limits = VOCABULARY_LIMITS,
} = {}) {
  let payload = null;
  const listeners = new Set();
  const emit = () => listeners.forEach((listener) => listener(api.snapshot()));

  try {
    const cached = storage?.getItem?.(VOCABULARY_STORAGE_KEY);
    if (cached) {
      const result = parseVocabularyJson(cached, limits);
      if (result.ok) payload = result.value;
      else storage?.removeItem?.(VOCABULARY_STORAGE_KEY);
    }
  } catch (_error) {
    payload = null;
  }

  const api = Object.freeze({
    snapshot: () => ({
      status: payload ? 'loaded' : 'empty',
      entryCount: payload?.entries.length || 0,
    }),
    subscribe(listener) {
      if (typeof listener !== 'function') return () => {};
      listeners.add(listener);
      listener(api.snapshot());
      return () => listeners.delete(listener);
    },
    load(source) {
      const result = parseVocabularyJson(source, limits);
      if (!result.ok) return { ...result, status: 'invalid' };
      try {
        storage?.setItem?.(VOCABULARY_STORAGE_KEY, JSON.stringify(result.value));
      } catch (_error) {
        return {
          ok: false,
          status: 'invalid',
          errors: ['vocabulary cache could not be persisted'],
        };
      }
      payload = result.value;
      emit();
      return { ok: true, status: 'loaded', entryCount: payload.entries.length };
    },
    clear() {
      payload = null;
      try {
        storage?.removeItem?.(VOCABULARY_STORAGE_KEY);
      } catch (_error) {
        /* local state is still cleared */
      }
      emit();
      return { ok: true, status: 'empty' };
    },
    translate(key, language = 'en', fallback = key, { schoolMode = false } = {}) {
      if (schoolMode || !payload) return fallback;
      const match = payload.entries.find(
        (entry) => entry.language === language && entry.key === key,
      );
      return match ? match.value : fallback;
    },
  });
  return api;
}
