/**
 * View model for the Deploy surface (Releases, Feature flags, Packages, Containers),
 * ported from Deploy.dc.html's state + renderVals(). Field names mirror GitLab's real
 * Releases, Feature Flags, Package Registry, and Container Registry API payloads.
 */

import { assertCollection, requestJson, requireEndpoint } from '../live-data';

export const DEPLOY_TABS = Object.freeze([
  { id: 'releases', label: 'Releases' },
  { id: 'feature-flags', label: 'Feature flags' },
  { id: 'packages', label: 'Packages' },
  { id: 'containers', label: 'Containers' },
]);

/** Deploy's own left-nav sub-items, expanded under the top-level "Deploy" section. */
export const DEPLOY_SUBNAV = Object.freeze([
  { tabId: 'releases', label: 'Releases', icon: 'releases', href: '#/deploy/releases' },
  { tabId: 'feature-flags', label: 'Feature flags', icon: 'toggle-on', href: '#/deploy/feature_flags' },
  { tabId: 'packages', label: 'Package registry', icon: 'package', href: '#/deploy/packages' },
  { tabId: 'containers', label: 'Container registry', icon: 'container', href: '#/deploy/container_registry' },
]);

/** The rest of GitLab's top-level project nav, for orientation — Deploy is the active section. */
export const DEPLOY_SIDEBAR_ITEMS = Object.freeze([
  { id: 'overview', label: 'Project overview', icon: 'home', href: '#/overview' },
  { id: 'manage', label: 'Manage', icon: 'group', href: '#/manage' },
  { id: 'plan', label: 'Plan', icon: 'flag', href: '#/plan' },
  { id: 'code', label: 'Code', icon: 'code', href: '#/code' },
  { id: 'build', label: 'Build', icon: 'build', href: '#/build' },
  { id: 'secure', label: 'Secure', icon: 'shield', href: '#/secure' },
  { id: 'deploy', label: 'Deploy', icon: 'releases', href: '#/deploy', active: true },
  { id: 'operate', label: 'Operate', icon: 'cloud', href: '#/operate' },
  { id: 'monitor', label: 'Monitor', icon: 'monitor', href: '#/monitor' },
  { id: 'analyze', label: 'Analyze', icon: 'chart', href: '#/analyze' },
  { id: 'settings', label: 'Settings', icon: 'settings', href: '#/settings' },
]);

const HOUR = 3600 * 1000;
const DAY = 24 * HOUR;
const WEEK = 7 * DAY;
const MONTH = 30 * DAY;

export function formatRelativeTime(iso, now = Date.now()) {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return '';
  const diffMs = Math.max(0, now - then);
  if (diffMs < 60 * 1000) return 'just now';
  if (diffMs < HOUR) return `${Math.floor(diffMs / (60 * 1000))}m ago`;
  if (diffMs < DAY) return `${Math.floor(diffMs / HOUR)}h ago`;
  if (diffMs < WEEK) return `${Math.floor(diffMs / DAY)}d ago`;
  if (diffMs < MONTH) return `${Math.floor(diffMs / WEEK)}w ago`;
  return `${Math.floor(diffMs / MONTH)}mo ago`;
}

/**
 * Plain-text-by-default, opt-in-regex matcher. Fails open (matches everything) on an
 * invalid pattern rather than hiding content behind a broken filter, while still
 * surfacing the syntax error so the search field can show it.
 */
export function createSearchMatcher({ query, regexMode }) {
  if (!query) return { test: () => true, valid: true, error: '' };
  if (!regexMode) {
    const needle = query.toLowerCase();
    return { test: (text) => text.toLowerCase().includes(needle), valid: true, error: '' };
  }
  try {
    const expression = new RegExp(query, 'i');
    return { test: (text) => expression.test(text), valid: true, error: '' };
  } catch (error) {
    return { test: () => true, valid: false, error: error.message };
  }
}

/** Ported verbatim from renderVals(): releases/packages/containers match on name only, flags on name + sub. */
export function releaseCorpus(release) {
  return release.name;
}
export function flagCorpus(flag) {
  return `${flag.name} ${flag.sub}`;
}
export function packageCorpus(pkg) {
  return pkg.name;
}
export function containerCorpus(image) {
  return image.name;
}

export function createInitialReleases(now = Date.now()) {
  return [
    {
      id: 'rel-17-2-0',
      name: 'v17.2.0 — Material milestone',
      tagRef: 'v17.2.0',
      assetsCount: 4,
      note: 'evidence collected',
      createdAt: new Date(now - WEEK).toISOString(),
    },
    {
      id: 'rel-17-1-2',
      name: 'v17.1.2 — Poll backoff patch',
      tagRef: 'v17.1.2',
      assetsCount: 2,
      note: '',
      createdAt: new Date(now - 3 * WEEK).toISOString(),
    },
    {
      id: 'rel-17-1-1',
      name: 'v17.1.1 — Favicon contrast patch',
      tagRef: 'v17.1.1',
      assetsCount: 2,
      note: '',
      createdAt: new Date(now - MONTH).toISOString(),
    },
  ].map((release) => ({
    ...release,
    sub: `Tag ${release.tagRef} · ${release.assetsCount} asset${release.assetsCount === 1 ? '' : 's'}${release.note ? ` · ${release.note}` : ''}`,
  }));
}

export function createInitialFlags() {
  return [
    { id: 'flag-regex-search-mode', name: 'regex_search_mode', sub: 'All users · introduced 5f01bd93', on: true },
    { id: 'flag-board-virtualization', name: 'board_virtualization', sub: '50% of users · perf experiment', on: true },
    { id: 'flag-md3-theme', name: 'md3_theme', sub: 'Internal users only', on: true },
    { id: 'flag-legacy-diff-viewer', name: 'legacy_diff_viewer', sub: 'Deprecated · removal in 17.4', on: false },
  ];
}

export function createInitialPackages(now = Date.now()) {
  return [
    { id: 'pkg-client-2-4-1', name: 'phoenix-api-client 2.4.1', sub: 'npm · published by CI #8819', sizeBytes: 412 * 1024, createdAt: new Date(now - WEEK).toISOString() },
    { id: 'pkg-gem-2-4-1', name: 'phoenix_api 2.4.1', sub: 'gem · published by CI #8819', sizeBytes: 188 * 1024, createdAt: new Date(now - WEEK).toISOString() },
    { id: 'pkg-client-2-4-0', name: 'phoenix-api-client 2.4.0', sub: 'npm · superseded', sizeBytes: 408 * 1024, createdAt: new Date(now - 3 * WEEK).toISOString() },
  ];
}

export function createInitialImages(now = Date.now()) {
  return [
    { id: 'img-latest', name: 'phoenix-api:latest', sub: 'digest 3f9a…e2c1 · 12 layers', sizeBytes: 214 * 1024 * 1024, createdAt: new Date(now - 2 * HOUR).toISOString() },
    { id: 'img-17-2-0', name: 'phoenix-api:v17.2.0', sub: 'digest 88b0…19aa · 12 layers', sizeBytes: 214 * 1024 * 1024, createdAt: new Date(now - WEEK).toISOString() },
    { id: 'img-review-1285', name: 'phoenix-api-review:mr-1285', sub: 'review app image · auto-expires', sizeBytes: 216 * 1024 * 1024, createdAt: new Date(now - 6 * HOUR).toISOString() },
  ];
}

export function formatBytes(bytes) {
  if (!Number.isFinite(bytes) || bytes < 0) return '';
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(bytes >= 100 * 1024 * 1024 ? 0 : 1)} MB`;
}

const collectionOrEmpty = (payload, label) => {
  if (payload == null) return [];
  return assertCollection(payload, label);
};

/**
 * Rails serializers and registry endpoints do not share the design row shape.
 * Keep that translation at the boundary, preserving only server-provided
 * values.  In particular, no client-side owner, status, or release label is
 * invented when an API omits it.
 */
export function normalizeRelease(release) {
  const tag = release.tag_name || release.tag || release.tag_ref || release.name;
  const assets = release.assets?.count ?? release.assets?.links?.length ?? release.assets_count;
  return {
    id: String(release.id ?? tag),
    name: release.name || tag,
    tagRef: tag,
    assetsCount: Number.isFinite(assets) ? assets : 0,
    note: release.description || '',
    createdAt: release.released_at || release.created_at || release.createdAt || '',
    sub: [tag ? `Tag ${tag}` : '', Number.isFinite(assets) ? `${assets} asset${assets === 1 ? '' : 's'}` : ''].filter(Boolean).join(' · '),
  };
}

export function normalizeDeployCollection(kind, items) {
  const normalizers = {
    releases: normalizeRelease,
    featureFlags: (flag) => ({ id: String(flag.id ?? flag.name), name: flag.name, sub: flag.description || flag.scope || '', on: Boolean(flag.active ?? flag.enabled) }),
    packages: (pkg) => ({ id: String(pkg.id), name: [pkg.name, pkg.version].filter(Boolean).join(' '), sub: pkg.package_type || pkg.package_manager || '', sizeBytes: Number(pkg.size ?? pkg.size_bytes) || 0, createdAt: pkg.created_at || '' }),
    containers: (image) => ({ id: String(image.id ?? image.path), name: image.name || image.path, sub: image.location || image.path || '', sizeBytes: Number(image.size ?? image.size_bytes) || 0, createdAt: image.created_at || '' }),
  };
  return collectionOrEmpty(items, kind).map(normalizers[kind]);
}

/** Fetch live Deploy collections. There is intentionally no fixture fallback. */
export async function fetchDeployData({ endpoints, fetchImpl } = {}) {
  const fetchCollection = async (key, label) => {
    if (!endpoints?.[key]) return [];
    return requestJson(requireEndpoint(endpoints, key), { fetchImpl }).then((payload) => collectionOrEmpty(payload, label));
  };
  const [releases, flags, packages, containers] = await Promise.all([
    fetchCollection('releases', 'releases'), fetchCollection('featureFlags', 'feature flags'),
    fetchCollection('packages', 'packages'), fetchCollection('containers', 'containers'),
  ]);
  return {
    releases: normalizeDeployCollection('releases', releases),
    flags: normalizeDeployCollection('featureFlags', flags),
    packages: normalizeDeployCollection('packages', packages),
    containers: normalizeDeployCollection('containers', containers),
  };
}

export function updateFeatureFlag({ endpoints, id, enabled, fetchImpl } = {}) {
  return requestJson(requireEndpoint(endpoints, 'updateFeatureFlag').replace(':id', encodeURIComponent(id)), {
    fetchImpl,
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ enabled }),
  });
}

export function deleteDeployItem({ endpoints, kind, id, fetchImpl } = {}) {
  const endpoint = requireEndpoint(endpoints, kind).replace(':id', encodeURIComponent(id));
  return requestJson(endpoint, { fetchImpl, method: 'DELETE' });
}
