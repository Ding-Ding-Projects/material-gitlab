/**
 * View model for the Plan surface, ported from Plan.dc.html's state and
 * renderVals(). Kept as plain data plus pure functions so a real API can
 * replace the fetch* functions without touching any component.
 */

export const PLAN_TABS = Object.freeze(['Milestones', 'Iterations', 'Wiki', 'Requirements']);

export const TAB_ICON = Object.freeze({
  Milestones: 'flag',
  Iterations: 'update',
  Requirements: 'fact-check',
});

// Badge background/foreground pair per row state, mirrors the design's stMeta map.
export const STATUS_META = Object.freeze({
  active: ['var(--gl-mds-goodc)', 'var(--gl-mds-good)'],
  closed: ['var(--gl-mds-surfch)', 'var(--gl-mds-onsurfv)'],
  upcoming: ['var(--gl-mds-primc)', 'var(--gl-mds-onprimc)'],
  satisfied: ['var(--gl-mds-goodc)', 'var(--gl-mds-good)'],
  failed: ['var(--gl-mds-errc)', 'var(--gl-mds-err)'],
  missing: ['var(--gl-mds-warnc)', 'var(--gl-mds-warn)'],
});

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

const DEFAULT_MILESTONES = [
  { id: 'ms-17-3', name: '17.3 — Regex everywhere', sub: 'Aug 1 – Aug 31 · 11 issues', pct: 45, state: 'active' },
  { id: 'ms-17-2', name: '17.2 — Material milestone', sub: 'Jul 1 – Jul 31 · 34 issues', pct: 100, state: 'closed' },
  { id: 'ms-17-4', name: '17.4 — Agent memory GA', sub: 'Sep 1 – Sep 30 · 10 issues', pct: 10, state: 'upcoming' },
];

const DEFAULT_ITERATIONS = [
  { id: 'it-34', name: 'Sprint 34', sub: 'Aug 11 – Aug 22 · current', pct: 38, state: 'active' },
  { id: 'it-33', name: 'Sprint 33', sub: 'Jul 28 – Aug 8', pct: 92, state: 'closed' },
  { id: 'it-35', name: 'Sprint 35', sub: 'Aug 25 – Sep 5', pct: 0, state: 'upcoming' },
];

const DEFAULT_REQUIREMENTS = [
  { id: 'rq-1', name: 'REQ-1 Search accepts valid ECMAScript regex', sub: 'satisfied by search/regex.spec.js', status: 'satisfied' },
  { id: 'rq-2', name: 'REQ-2 Board drag persists ordering across reload', sub: 'verified in nightly run', status: 'satisfied' },
  { id: 'rq-3', name: 'REQ-3 All badges meet WCAG AA in both themes', sub: 'failing for warning badge in dark', status: 'failed' },
  { id: 'rq-4', name: 'REQ-4 Palette reachable from every surface', sub: 'awaiting test', status: 'missing' },
];

const DEFAULT_WIKI_PAGES = [
  {
    id: 'wiki-home',
    title: 'Home',
    body:
      'Welcome to the phoenix-api wiki.\n\nStart with Development setup, then read the MD3 rewrite notes. The regex search spec documents the builder contract shared by every surface.',
    meta: 'last edited by dweiss · 3h ago',
  },
  {
    id: 'wiki-dev-setup',
    title: 'Development setup',
    body: '1. bundle install && yarn install\n2. bin/rails db:setup\n3. bin/rails s + yarn dev\n\nUse mise for toolchain pins. Runner images match .gitlab-ci.yml.',
    meta: 'last edited by junpark · 2d ago',
  },
  {
    id: 'wiki-md3-notes',
    title: 'MD3 rewrite notes',
    body:
      'Token layer lives in app/assets/stylesheets/tokens.\n\nRules:\n- container pairs for all status colors\n- pill nav, 20px card radius\n- no raw hex outside the token layer',
    meta: 'last edited by dweiss · 1d ago',
  },
  {
    id: 'wiki-regex-spec',
    title: 'Regex search spec',
    body:
      'Every search bar exposes:\n- a .* mode toggle\n- the shared builder (flags i g m s, snippets, live preview, capture groups)\n- invalid patterns fall back to substring match and surface an error chip',
    meta: 'last edited by junpark · 5h ago',
  },
];

export function createInitialState(overrides = {}) {
  return {
    milestones: clone(DEFAULT_MILESTONES),
    iterations: clone(DEFAULT_ITERATIONS),
    requirements: clone(DEFAULT_REQUIREMENTS),
    wiki: clone(DEFAULT_WIKI_PAGES),
    ...overrides,
  };
}

/**
 * Default local loaders. Mirror the design's inline mock state — each
 * resolves the bundled fixture. Replace by passing matching props into
 * <Plan fetch-milestones="..."> etc. to point the surface at a real API.
 */
export async function fetchMilestones() {
  return clone(DEFAULT_MILESTONES);
}

export async function fetchIterations() {
  return clone(DEFAULT_ITERATIONS);
}

export async function fetchRequirements() {
  return clone(DEFAULT_REQUIREMENTS);
}

export async function fetchWikiPages() {
  return clone(DEFAULT_WIKI_PAGES);
}

/** Builds a row view model for a milestone/iteration/requirement, mirrors mkRow(). */
export function buildRow(entity, icon) {
  const badgeKey = entity.state || entity.status;
  const meta = STATUS_META[badgeKey] || STATUS_META.upcoming;
  return {
    id: entity.id,
    icon,
    iconColor: 'var(--gl-mds-prim)',
    title: entity.name,
    sub: entity.sub,
    pct: entity.pct !== undefined ? `${entity.pct}%` : null,
    badge: badgeKey,
    badgeBg: meta[0],
    badgeFg: meta[1],
    meta: '',
  };
}

/**
 * Plain-text-or-regex predicate, mirrors the design's matcher(). An invalid
 * pattern in regex mode matches everything (same as the source renderVals),
 * with `error: true` so the caller can still surface an honest indicator.
 */
export function createMatcher(query, regexMode) {
  if (!query) return { test: () => true, error: false };
  if (regexMode) {
    try {
      const re = new RegExp(query, 'i');
      return { test: (text) => re.test(text), error: false };
    } catch (_error) {
      return { test: () => true, error: true };
    }
  }
  const lowered = query.toLowerCase();
  return { test: (text) => text.toLowerCase().includes(lowered), error: false };
}

export function withField(list, ids, field, value) {
  const idSet = new Set(ids);
  return list.map((item) => (idSet.has(item.id) ? { ...item, [field]: value } : item));
}

export function withoutIds(list, ids) {
  const idSet = new Set(ids);
  return list.filter((item) => !idSet.has(item.id));
}

export function rowsToCsv(rows) {
  const header = ['Name', 'Detail', 'Status', 'Progress'];
  const escapeCell = (value) => `"${String(value ?? '').replace(/"/g, '""')}"`;
  const lines = [header.map(escapeCell).join(',')];
  rows.forEach((row) => lines.push([row.title, row.sub, row.badge, row.pct || ''].map(escapeCell).join(',')));
  return lines.join('\r\n');
}

export function updateWikiBody(pages, pageId, body) {
  return pages.map((page) => (page.id === pageId ? { ...page, body } : page));
}

export function markWikiSaved(pages, pageId) {
  return pages.map((page) => (page.id === pageId ? { ...page, meta: 'last edited by you · just now' } : page));
}
