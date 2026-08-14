import { createMaterialTokens } from './tokens';

export const SETTINGS_SCHEMA_VERSION = 1;
export const SETTINGS_STORAGE_KEY = 'material-system.settings.v1';
export const SETTINGS_MAX_BYTES = 64 * 1024;

const LANGUAGES = new Set(['en', 'yue', 'bilingual']);
const THEMES = new Set(['light', 'dark', 'system']);
const DENSITIES = new Set(['compact', 'comfortable', 'spacious']);
const MOTIONS = new Set(['full', 'reduced']);
const HEX_COLOR = /^#[0-9a-f]{6}(?:[0-9a-f]{2})?$/i;

export const DEFAULT_SETTINGS = Object.freeze({
  schemaVersion: SETTINGS_SCHEMA_VERSION,
  language: 'en',
  funnyLevelEnglish: 3,
  funnyLevelCantonese: 3,
  showDialogEmojis: true,
  theme: 'system',
  density: 'comfortable',
  accentColor: '#6750A4',
  fontFamily: 'system-ui',
  fontScale: 1,
  motion: 'full',
});

const clone = (value) => JSON.parse(JSON.stringify(value));

function boundedString(value, maxLength) {
  return typeof value === 'string' && value.length > 0 && value.length <= maxLength;
}

export function validateSettings(candidate) {
  if (!candidate || typeof candidate !== 'object' || Array.isArray(candidate)) return { ok: false, errors: ['settings must be an object'] };
  const errors = [];
  if (candidate.schemaVersion !== SETTINGS_SCHEMA_VERSION) errors.push('unsupported schema version');
  if (!LANGUAGES.has(candidate.language)) errors.push('invalid language');
  for (const key of ['funnyLevelEnglish', 'funnyLevelCantonese']) {
    if (!Number.isInteger(candidate[key]) || candidate[key] < 1 || candidate[key] > 5) errors.push(`${key} must be an integer from 1 to 5`);
  }
  if (typeof candidate.showDialogEmojis !== 'boolean') errors.push('showDialogEmojis must be boolean');
  if (!THEMES.has(candidate.theme)) errors.push('invalid theme');
  if (!DENSITIES.has(candidate.density)) errors.push('invalid density');
  if (!HEX_COLOR.test(candidate.accentColor)) errors.push('accentColor must be a #RRGGBB or #RRGGBBAA color');
  if (!boundedString(candidate.fontFamily, 128)) errors.push('fontFamily must be 1-128 characters');
  if (typeof candidate.fontScale !== 'number' || !Number.isFinite(candidate.fontScale) || candidate.fontScale < 0.8 || candidate.fontScale > 2) errors.push('fontScale must be between 0.8 and 2');
  if (!MOTIONS.has(candidate.motion)) errors.push('invalid motion preference');
  return errors.length ? { ok: false, errors } : { ok: true, value: clone(candidate) };
}

export function migrateSettings(input) {
  const source = input && typeof input === 'object' && !Array.isArray(input) ? input : {};
  const migrated = { ...clone(DEFAULT_SETTINGS) };
  if (source.schemaVersion === 0 || source.schemaVersion === undefined) {
    if (typeof source.languageMode === 'string') migrated.language = source.languageMode;
    if (Number.isInteger(source.funnyLevel)) migrated.funnyLevelEnglish = migrated.funnyLevelCantonese = source.funnyLevel;
  }
  for (const key of Object.keys(DEFAULT_SETTINGS)) if (key in source) migrated[key] = source[key];
  migrated.schemaVersion = SETTINGS_SCHEMA_VERSION;
  const checked = validateSettings(migrated);
  return checked.ok ? checked.value : clone(DEFAULT_SETTINGS);
}

export function loadSettings(storage = globalThis.localStorage) {
  if (!storage || typeof storage.getItem !== 'function') return clone(DEFAULT_SETTINGS);
  try {
    const raw = storage.getItem(SETTINGS_STORAGE_KEY);
    if (!raw || raw.length > SETTINGS_MAX_BYTES) return clone(DEFAULT_SETTINGS);
    return migrateSettings(JSON.parse(raw));
  } catch (_error) {
    return clone(DEFAULT_SETTINGS);
  }
}

export function saveSettings(settings, storage = globalThis.localStorage) {
  const normalized = migrateSettings(settings);
  const checked = validateSettings(normalized);
  if (!checked.ok || !storage || typeof storage.setItem !== 'function') return { ok: false, errors: checked.errors || ['storage unavailable'] };
  const serialized = JSON.stringify(checked.value);
  if (serialized.length > SETTINGS_MAX_BYTES) return { ok: false, errors: ['settings exceed storage limit'] };
  try { storage.setItem(SETTINGS_STORAGE_KEY, serialized); return { ok: true, value: checked.value }; } catch (_error) { return { ok: false, errors: ['settings could not be persisted'] }; }
}

export function updateSettings(patch, storage = globalThis.localStorage) {
  return saveSettings({ ...loadSettings(storage), ...(patch || {}) }, storage);
}

export function subscribeSettings(listener, target = globalThis) {
  if (!target || typeof target.addEventListener !== 'function' || typeof listener !== 'function') return () => {};
  const onStorage = (event) => { if (event.key === SETTINGS_STORAGE_KEY) listener(loadSettings(target.localStorage)); };
  target.addEventListener('storage', onStorage);
  return () => target.removeEventListener('storage', onStorage);
}

export function settingsTokens(settings = DEFAULT_SETTINGS) {
  return createMaterialTokens({ scheme: settings.theme === 'dark' ? 'dark' : 'light', density: settings.density });
}
