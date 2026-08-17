/**
 * View model for the Deploy surface (Releases, Feature flags, Packages, Containers),
 * ported from Deploy.dc.html's state + renderVals(). Field names mirror GitLab's real
 * Releases, Feature Flags, Package Registry, and Container Registry API payloads so a
 * live fetch can replace each `createInitial*()` fixture without touching the components
 * that consume them.
 */

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
