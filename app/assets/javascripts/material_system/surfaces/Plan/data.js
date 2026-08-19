/**
 * View model and transport adapters for the Plan surface.
 *
 * The design reference is a visual contract only. Production data comes from
 * routes supplied by the Rails mount (or the explicit function seams used by
 * tests); this module intentionally has no fixture or seed fallback.
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

const rootConfig = () => {
  if (typeof window === 'undefined') return {};
  const configured = window.__MATERIAL_PLAN_ENDPOINTS__;
  if (configured && typeof configured === 'object') return configured;
  const root = document.querySelector('[data-material-plan]');
  return root ? { ...root.dataset } : {};
};

export function endpointFor(resource, options = {}) {
  const config = options.endpoints || rootConfig();
  const endpoint = options.endpoint || config[resource] || config[`${resource}Endpoint`];
  if (!endpoint) {
    throw new Error(`Plan ${resource} route is not configured by the server mount`);
  }
  return endpoint;
}

export async function requestJson(url, options = {}) {
  const { fetcher: injectedFetcher, endpoint: _endpoint, ...requestOptions } = options;
  const fetcher = injectedFetcher || (typeof fetch === 'function' ? fetch : null);
  if (!fetcher) throw new Error('Plan data transport is unavailable');
  const response = await fetcher(url, {
    credentials: 'same-origin',
    headers: { Accept: 'application/json', 'X-Requested-With': 'XMLHttpRequest', ...(options.headers || {}) },
    ...requestOptions,
  });
  if (!response.ok) {
    const error = new Error(`Plan data request failed (${response.status})`);
    error.status = response.status;
    throw error;
  }
  return response.json();
}

const listPayload = (payload) => {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.nodes)) return payload.nodes;
  if (Array.isArray(payload?.items)) return payload.items;
  if (Array.isArray(payload?.data?.nodes)) return payload.data.nodes;
  if (Array.isArray(payload?.data?.items)) return payload.data.items;
  return [];
};
const normalizeEntity = (entity) => ({
  ...entity,
  id: entity.id ?? entity.iid ?? entity.reference,
  name: entity.name ?? entity.title ?? entity.label ?? '',
  sub: entity.sub ?? entity.description ?? entity.dueDate ?? '',
  pct: entity.pct ?? entity.progress ?? undefined,
  state: entity.state ?? entity.status ?? 'upcoming',
  status: entity.status,
});

export async function fetchResource(resource, options = {}) {
  const payload = await requestJson(endpointFor(resource, options), options);
  return listPayload(payload).map(normalizeEntity);
}

export const fetchMilestones = (options = {}) => fetchResource('milestones', options);
export const fetchIterations = (options = {}) => fetchResource('iterations', options);
export const fetchRequirements = (options = {}) => fetchResource('requirements', options);

export async function fetchWikiPages(options = {}) {
  const payload = await requestJson(endpointFor('wiki', options), options);
  return listPayload(payload).map((page) => ({
    ...page,
    id: page.id ?? page.slug ?? page.title,
    title: page.title ?? page.name ?? '',
    body: page.content ?? page.body ?? page.format ?? '',
    meta: page.updatedAt || page.updated_at || page.author?.name || '',
  }));
}

export async function mutatePlanEntity({ resource, id, changes, options = {} }) {
  const endpoint = endpointFor(resource, options).replace(/\/$/, '') + `/${encodeURIComponent(id)}`;
  return requestJson(endpoint, { ...options, method: 'PATCH', body: JSON.stringify(changes), headers: { 'Content-Type': 'application/json' } });
}

export async function saveWikiPage({ id, body, options = {} }) {
  const endpoint = endpointFor('wiki', options).replace(/\/$/, '') + `/${encodeURIComponent(id)}`;
  return requestJson(endpoint, { ...options, method: 'PUT', body: JSON.stringify({ content: body }), headers: { 'Content-Type': 'application/json' } });
}

export async function deletePlanEntity({ resource, id, options = {} }) {
  const endpoint = endpointFor(resource, options).replace(/\/$/, '') + `/${encodeURIComponent(id)}`;
  return requestJson(endpoint, { ...options, method: 'DELETE' });
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
