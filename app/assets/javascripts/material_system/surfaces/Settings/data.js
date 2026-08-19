/**
 * View model helpers for the Settings surface. The checked-in design is a
 * visual contract only; production state must arrive through settingsAdapter.
 * These helpers deliberately contain no project, member, variable, branch,
 * integration, or secret-like fixture data.
 */

export const TABS = Object.freeze([
  { id: 'general', label: 'General' },
  { id: 'members', label: 'Members' },
  { id: 'cicd', label: 'CI/CD' },
  { id: 'integrations', label: 'Integrations' },
]);

export const ROLE_OPTIONS = Object.freeze(['Owner', 'Maintainer', 'Developer', 'Reporter', 'Guest']);

export const VISIBILITY_OPTIONS = Object.freeze([
  { value: 'Private', icon: 'lock' },
  { value: 'Internal', icon: 'shield' },
  { value: 'Public', icon: 'public' },
]);

export const LOGO_PRESET_COLORS = Object.freeze(['#6750c4', '#0b6e63', '#8f4a0e', '#35618e', '#b3261e']);

export const VOCABULARY_MAX_BYTES = 512 * 1024;

// mime type -> comma-separated list of realistic conversion targets. Mirrors
// the design's "known" map and doubles as the file-converter's honest
// unsupported-type boundary: a type absent from this map gets no offer.
export const CONVERTIBLE_TYPES = Object.freeze({
  'image/png': 'JPEG, WebP',
  'image/jpeg': 'PNG, WebP',
  'application/json': 'YAML, CSV',
  'text/csv': 'JSON',
  'text/markdown': 'HTML',
});

export function createInitialState(overrides = {}) {
  return {
    tab: 'general',
    projectName: '',
    visibility: '',
    logoColor: LOGO_PRESET_COLORS[0],
    logoFileName: '',
    vocabularyStatus: 'No vocabulary loaded',
    vocabularyOk: null,
    converterStatus: 'No file chosen',
    members: [],
    variables: [],
    protectedBranches: [],
    integrations: [],
    permissions: {},
    errors: [],
    ...overrides,
  };
}

export function initialsFor(name) {
  return String(name || '')
    .split(' ')
    .filter(Boolean)
    .map((word) => word[0])
    .join('')
    .toUpperCase();
}

export function logoLetterFor(projectName) {
  return (String(projectName || '')[0] || 'P').toUpperCase();
}

export function maskedValue() {
  return '•'.repeat(10);
}

/**
 * Plain-text-by-default / regex-opt-in matcher shared by every search field
 * on this surface. An invalid pattern fails open (shows everything) with an
 * explicit error message, matching the rest of the material-system surfaces.
 */
export function createMatcher(query, { regexMode = false, flags = 'i' } = {}) {
  const trimmed = String(query || '');
  if (!trimmed) return { test: () => true, valid: true, error: '' };
  if (!regexMode) {
    const needle = trimmed.toLowerCase();
    return { test: (text) => String(text ?? '').toLowerCase().includes(needle), valid: true, error: '' };
  }
  try {
    const expression = new RegExp(trimmed, flags);
    return { test: (text) => expression.test(String(text ?? '')), valid: true, error: '' };
  } catch (error) {
    return { test: () => true, valid: false, error: error.message };
  }
}

/** Validates an uploaded personal-vocabulary JSON file per the bounded local-only contract. */
export function validateVocabularyPayload(rawText, byteLength) {
  if (byteLength > VOCABULARY_MAX_BYTES) {
    return { ok: false, status: 'Rejected: over 512 KB size bound' };
  }
  let parsed;
  try {
    parsed = JSON.parse(rawText);
  } catch (_error) {
    return { ok: false, status: 'Rejected: not valid JSON' };
  }
  if (!parsed || typeof parsed !== 'object' || !parsed.version || typeof parsed.entries !== 'object' || parsed.entries === null) {
    return { ok: false, status: 'Rejected: missing version/entries schema' };
  }
  const termCount = Object.keys(parsed.entries).length;
  return { ok: true, status: `Loaded ${termCount} term${termCount === 1 ? '' : 's'} (v${parsed.version}) — local only` };
}

/** Honest local file-converter status line: real targets or an explicit unsupported-type message. */
export function converterStatusFor(fileName, mimeType) {
  const targets = CONVERTIBLE_TYPES[mimeType];
  if (targets) return `${fileName} (${mimeType || 'unknown'}) → available targets: ${targets}`;
  return `${fileName}: unsupported type — no conversion offered (honest handling)`;
}
