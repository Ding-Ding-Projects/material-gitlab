/**
 * View model for the Settings surface, ported from design/Settings.dc.html's
 * renderVals(). Kept as plain data + pure functions so a real settings API
 * can replace the in-memory arrays without touching any component — every
 * mutation below returns a new array/object rather than mutating in place.
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

export function defaultMembers() {
  return [
    { id: 'mb-1', name: 'Jun Park', handle: 'junpark', role: 'Maintainer' },
    { id: 'mb-2', name: 'Dana Weiss', handle: 'dweiss', role: 'Owner' },
    { id: 'mb-3', name: 'Omar Haddad', handle: 'ohaddad', role: 'Developer' },
    { id: 'mb-4', name: 'Priya Nair', handle: 'pnair', role: 'Reporter' },
  ];
}

export function defaultVariables() {
  return [
    { id: 'var-1', key: 'DEPLOY_TOKEN', value: 'glpat-9f2ke1', protected: true, revealed: false },
    { id: 'var-2', key: 'SENTRY_DSN', value: 'https://a1b2@sentry.io/42', protected: false, revealed: false },
    { id: 'var-3', key: 'REGISTRY_PASSWORD', value: 's3cr3t-r3g', protected: true, revealed: false },
  ];
}

export function defaultProtectedBranches() {
  return [
    { id: 'pb-1', name: 'main', merge: 'Maintainers', push: 'No one' },
    { id: 'pb-2', name: 'release/*', merge: 'Maintainers', push: 'Maintainers' },
  ];
}

export function defaultIntegrations() {
  return [
    { id: 'ig-1', name: 'Slack notifications', icon: 'notifications', desc: 'Pipeline and MR events to #phoenix-dev', on: true },
    { id: 'ig-2', name: 'Jira', icon: 'link', desc: 'Cross-reference issues by key', on: false },
    { id: 'ig-3', name: 'Prometheus', icon: 'monitoring', desc: 'Metrics scraping for environments', on: true },
    { id: 'ig-4', name: 'Mattermost', icon: 'forum', desc: 'Slash commands', on: false },
  ];
}

export function createInitialState(overrides = {}) {
  return {
    tab: 'general',
    projectName: 'phoenix-api',
    visibility: 'Internal',
    logoColor: LOGO_PRESET_COLORS[0],
    logoFileName: '',
    vocabularyStatus: 'No vocabulary loaded',
    vocabularyOk: null,
    converterStatus: 'No file chosen',
    members: defaultMembers(),
    variables: defaultVariables(),
    protectedBranches: defaultProtectedBranches(),
    integrations: defaultIntegrations(),
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

export function withRole(members, id, role) {
  return members.map((member) => (member.id === id ? { ...member, role } : member));
}

export function withoutIds(list, ids) {
  const removed = new Set(ids);
  return list.filter((item) => !removed.has(item.id));
}

export function withToggledReveal(variables, id) {
  return variables.map((variable) => (variable.id === id ? { ...variable, revealed: !variable.revealed } : variable));
}

export function nextVariableDraft(existingCount) {
  return { id: `var-${Date.now()}-${existingCount}`, key: `NEW_VARIABLE_${existingCount + 1}`, value: 'value', protected: false, revealed: true };
}

export function withToggledIntegrations(integrations, ids, on) {
  const targeted = new Set(ids);
  return integrations.map((integration) => (targeted.has(integration.id) ? { ...integration, on } : integration));
}
