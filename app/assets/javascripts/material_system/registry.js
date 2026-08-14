/**
 * Universal Material System contract registry.
 *
 * This module is deliberately data-first and dependency-free. Consumers add
 * one inventory for every rendered surface, then validate before accepting a
 * feature as complete. Empty or unverified evidence is a failure by design.
 */

export const REGISTRY_SCHEMA_VERSION = 1;

export const EVIDENCE_SLOTS = Object.freeze([
  'implementation',
  'documentation',
  'localization',
  'persistence',
  'tests',
  'builtArtifactInteraction',
  'captures',
]);

const CONTRACTS = [
  ['language-modes', 'Persisted English, playful Hong Kong Cantonese, and bilingual modes'],
  ['funny-levels', 'Independent English and Cantonese funny-level controls'],
  ['emoji-dialog-toggle', 'Persisted dialog and message-box emoji toggle'],
  ['school-mode', 'Shared renameable School mode with local unlock'],
  ['narrator', 'Spoken event narrator with per-language voices'],
  ['scheduled-settings', 'Scheduled and external settings sources'],
  ['dim-sum-surprise', 'Non-blocking startup dim-sum surprise'],
  ['regex-builder', 'Anchored full regex builder for every search field'],
  ['notification-centre', 'Non-blocking notifications and reviewable centre'],
  ['material-appearance', 'Material 3 appearance and per-element editors'],
  ['tabs-groups-search', 'Tabbed navigation, groups, pinning, and searches'],
  ['landing-offline-docs', 'Landing page and offline documentation browser'],
  ['command-palette', 'Ctrl+Shift+F command palette with exact teleport'],
  ['destructive-super-confirmation', 'Two-key destructive-action confirmation'],
  ['local-history', 'Append-only local version history and restore'],
  ['changelog', 'In-app changelog viewer with commit links'],
  ['external-editor', 'External-editor handoff with VS Code export'],
  ['exports', 'Complete multi-format exports'],
  ['bulk-actions', 'Bulk actions for every collection'],
  ['accessibility-responsive-sizing', 'Keyboard, screen-reader, contrast, and responsive sizing'],
  ['personal-vocabulary-upload', 'Local personal-vocabulary JSON upload'],
  ['app-logo-customization', 'App-logo presets, upload, and safe conversion'],
  ['file-converter', 'Bundled local file-converter adapter catalog'],
  ['ollama-suite-manager', 'Local Ollama suite manager'],
  ['toy-locks-support-tickets', 'Per-element toy locks and Support Tickets'],
  ['extension-download-surfaces', 'Browser-extension download start/progress/completion'],
  ['authenticator', 'Built-in local TOTP authenticator'],
  ['display-name-rename', 'Persisted user-renamable display name'],
  ['status-hub', 'Live Material 3 Status Hub registration and reporting'],
];

const DEFAULT_REQUIREMENTS = Object.freeze([
  'implementation',
  'localized-copy',
  'documentation',
  'persistence-where-applicable',
  'focused-verification',
  'built-artifact-interaction',
  'real-capture',
]);

export const UNIVERSAL_FEATURE_CONTRACTS = Object.freeze(
  CONTRACTS.map(([id, title]) =>
    Object.freeze({
      id,
      title,
      required: true,
      requirements: DEFAULT_REQUIREMENTS,
      evidenceSlots: EVIDENCE_SLOTS,
    }),
  ),
);

const CONTRACT_IDS = new Set(UNIVERSAL_FEATURE_CONTRACTS.map(({ id }) => id));

const emptyEvidence = () => ({
  implementation: null,
  documentation: null,
  localization: null,
  persistence: null,
  tests: null,
  builtArtifactInteraction: null,
  captures: [],
});

export const createFeatureInventory = (contractId) => {
  if (!CONTRACT_IDS.has(contractId)) throw new Error(`Unknown universal feature contract: ${contractId}`);
  return {
    contractId,
    status: 'unverified',
    evidence: emptyEvidence(),
    negativeRegression: null,
    notes: '',
  };
};

export const createSurfaceInventory = ({ id, kind, title, route }) => {
  if (!/^surface\.[a-z0-9]+(?:[-.][a-z0-9]+)*$/.test(id || '')) {
    throw new Error(`Invalid stable surface id: ${id}`);
  }
  if (![kind, title, route].every((value) => typeof value === 'string' && value.trim())) {
    throw new Error('Surface inventory requires id, kind, title, and route');
  }
  return {
    id,
    kind,
    title,
    route,
    coverage: UNIVERSAL_FEATURE_CONTRACTS.map(({ id: contractId }) => createFeatureInventory(contractId)),
  };
};

export const createRegistry = ({ surfaces = [], negativeRegression = null } = {}) => ({
  schemaVersion: REGISTRY_SCHEMA_VERSION,
  model: 'material-system.universal-contract-inventory',
  features: UNIVERSAL_FEATURE_CONTRACTS,
  surfaces,
  negativeRegression,
});

const isObject = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);
const nonEmpty = (value) => typeof value === 'string' && value.trim().length > 0;
const verifiedRef = (value) =>
  isObject(value) && value.verified === true && nonEmpty(value.ref);

const evidenceValid = (evidence, path, errors) => {
  if (!isObject(evidence)) {
    errors.push(`${path}: evidence object is required`);
    return;
  }
  for (const key of Object.keys(evidence)) {
    if (!EVIDENCE_SLOTS.includes(key)) errors.push(`${path}.${key}: unknown evidence slot`);
  }
  for (const key of EVIDENCE_SLOTS) {
    const value = evidence[key];
    if (key === 'captures') {
      if (!Array.isArray(value) || value.length === 0 || value.some((capture) => !verifiedRef(capture))) {
        errors.push(`${path}.captures: at least one verified real capture is required`);
      }
    } else if (!verifiedRef(value)) {
      errors.push(`${path}.${key}: verified ref is required`);
    }
  }
};

export const validateRegistry = (registry) => {
  const errors = [];
  if (!isObject(registry)) return { valid: false, errors: ['registry must be an object'] };
  if (registry.schemaVersion !== REGISTRY_SCHEMA_VERSION) errors.push('schemaVersion must be exactly 1');
  if (!Array.isArray(registry.features)) errors.push('features must be an array');
  if (!Array.isArray(registry.surfaces) || registry.surfaces.length === 0) errors.push('at least one surface inventory is required');
  if (!verifiedRef(registry.negativeRegression)) errors.push('registry negativeRegression must be a verified ref');

  const featureIds = (registry.features || []).map((feature) => feature && feature.id);
  const featureSeen = new Set();
  for (const id of featureIds) {
    if (!CONTRACT_IDS.has(id)) errors.push(`unknown canonical feature: ${id}`);
    if (featureSeen.has(id)) errors.push(`duplicate canonical feature: ${id}`);
    featureSeen.add(id);
  }
  for (const id of CONTRACT_IDS) if (!featureSeen.has(id)) errors.push(`missing canonical feature: ${id}`);

  const surfaces = registry.surfaces || [];
  const surfaceSeen = new Set();
  for (const [surfaceIndex, surface] of surfaces.entries()) {
    const path = `surfaces[${surfaceIndex}]`;
    if (!isObject(surface) || !nonEmpty(surface.id)) {
      errors.push(`${path}: stable surface id is required`);
      continue;
    }
    if (surfaceSeen.has(surface.id)) errors.push(`${path}.id: duplicate surface id ${surface.id}`);
    surfaceSeen.add(surface.id);
    if (!Array.isArray(surface.coverage)) {
      errors.push(`${path}.coverage: array is required`);
      continue;
    }
    const coverageSeen = new Set();
    for (const [rowIndex, row] of surface.coverage.entries()) {
      const rowPath = `${path}.coverage[${rowIndex}]`;
      if (!isObject(row) || !nonEmpty(row.contractId)) {
        errors.push(`${rowPath}: contractId is required`);
        continue;
      }
      if (!CONTRACT_IDS.has(row.contractId)) errors.push(`${rowPath}: unknown contract ${row.contractId}`);
      if (coverageSeen.has(row.contractId)) errors.push(`${rowPath}: duplicate contract ${row.contractId}`);
      coverageSeen.add(row.contractId);
      evidenceValid(row.evidence, `${rowPath}.evidence`, errors);
      if (!verifiedRef(row.negativeRegression)) errors.push(`${rowPath}.negativeRegression: verified ref is required`);
    }
    for (const id of CONTRACT_IDS) if (!coverageSeen.has(id)) errors.push(`${path}: missing contract ${id}`);
  }
  return { valid: errors.length === 0, errors };
};

