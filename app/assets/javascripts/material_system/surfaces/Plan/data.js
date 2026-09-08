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

export const PLAN_ADAPTER_METHODS = Object.freeze([
  'fetchMilestones', 'fetchIterations', 'fetchRequirements', 'fetchWikiPages',
  'mutateEntity', 'deleteEntity', 'saveWiki',
]);

export class PlanResourceUnavailableError extends Error {
  constructor(resource, message, status = null) {
    super(message || `${resource} is unavailable for this project.`);
    this.name = 'PlanResourceUnavailableError';
    this.resource = resource;
    this.status = status;
  }
}

const currentProjectId = () => globalThis.gon?.current_project_id
  || globalThis.gl?.snowplowStandardContext?.data?.project_id
  || globalThis.gl?.project_id
  || null;

const projectApiBase = (projectId) => {
  if (projectId === null || projectId === undefined || projectId === '') {
    throw new Error('Plan surface requires a real project id from its server mount');
  }
  const root = globalThis.gon?.relative_url_root || '';
  return `${root}/api/v4/projects/${encodeURIComponent(projectId)}`;
};

const csrfToken = (root) => root?.querySelector?.('meta[name="csrf-token"]')?.content
  || (typeof document !== 'undefined' ? document.querySelector('meta[name="csrf-token"]')?.content : '')
  || '';

const parsePlanResponse = async (response, resource) => {
  if (response.status === 204) return null;
  const payload = await response.json().catch(() => null);
  if (response.ok) return payload;
  const message = payload?.message || payload?.error || `${resource} request failed (${response.status})`;
  if (response.status === 404 || response.status === 403 || response.status === 501) {
    throw new PlanResourceUnavailableError(resource, message, response.status);
  }
  const error = new Error(message);
  error.status = response.status;
  error.details = payload;
  throw error;
};

const normalizeMilestone = (milestone = {}) => normalizeEntity({
  ...milestone,
  id: milestone.id ?? milestone.iid,
  name: milestone.title,
  sub: milestone.description || milestone.due_date || '',
  state: milestone.state,
});

const normalizeIteration = (iteration = {}) => normalizeEntity({
  ...iteration,
  id: iteration.id ?? iteration.iid,
  name: iteration.title || iteration.name || `Iteration ${iteration.sequence || iteration.iid || iteration.id}`,
  sub: iteration.description || iteration.due_date || iteration.start_date || '',
  state: ({ 1: 'upcoming', 2: 'active', 3: 'closed' })[iteration.state] || iteration.state,
});

const normalizeWikiPage = (page = {}) => ({
  ...page,
  id: page.slug ?? page.id ?? page.title,
  title: page.title || page.slug || '',
  body: page.content || '',
  meta: page.updated_at || page.updatedAt || page.author?.name || '',
  format: page.format || 'markdown',
});

/**
 * Bridges the Plan design surface to existing project-scoped REST resources.
 * CE instances may not expose iterations or requirements, so those resources
 * reject independently and the view can report the affected tab honestly.
 */
export function createProjectPlanAdapter({ projectId = currentProjectId(), root = null, fetcher = globalThis.fetch, permissions = {} } = {}) {
  if (typeof fetcher !== 'function') throw new Error('Plan surface requires same-origin fetch transport');
  const apiBase = projectApiBase(projectId);
  const wikiFormats = new Map();
  const request = async (resource, url, { method = 'GET', body } = {}) => {
    const response = await fetcher(url, {
      method,
      credentials: 'same-origin',
      redirect: 'error',
      headers: {
        Accept: 'application/json',
        ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
        ...(method === 'GET' || !csrfToken(root) ? {} : { 'X-CSRF-Token': csrfToken(root) }),
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
    return parsePlanResponse(response, resource);
  };
  const unavailable = (resource) => async () => {
    throw new PlanResourceUnavailableError(resource, `${resource} are not supported in this planning view. Use the dedicated project planning tools when available.`);
  };
  const list = async (resource, url) => {
    const rows = [];
    for (let page = 1; page <= 100; page += 1) {
      const values = await request(resource, `${url}&per_page=100&page=${page}`);
      if (!Array.isArray(values)) throw new Error(`Invalid ${resource} response from the server`);
      rows.push(...values);
      if (values.length < 100) return rows;
    }
    throw new Error(`${resource} exceeds the supported page limit. Use the dedicated project editor.`);
  };

  return {
    async fetchMilestones() {
      const values = await list('milestones', `${apiBase}/milestones?state=all`);
      return values.map(normalizeMilestone);
    },
    async fetchIterations() {
      const values = await list('iterations', `${apiBase}/iterations?state=all`);
      return values.map(normalizeIteration);
    },
    fetchRequirements: unavailable('requirements'),
    async fetchWikiPages() {
      const values = await list('wiki', `${apiBase}/wikis?with_content=1`);
      wikiFormats.clear();
      return values.map((page) => {
        const normalized = normalizeWikiPage(page);
        wikiFormats.set(normalized.id, normalized.format);
        return normalized;
      });
    },
    async mutateEntity({ resource, id, changes = {} }) {
      if (permissions.milestones === false) throw new Error('Milestone changes are unavailable for your current project access.');
      if (resource !== 'milestones') {
        throw new PlanResourceUnavailableError(resource, `${resource} state updates are unavailable on this GitLab edition.`);
      }
      const state = changes.state;
      const stateEvent = state === 'closed' ? 'close' : state === 'active' ? 'activate' : null;
      if (!stateEvent) throw new Error('Milestone state must be active or closed');
      return normalizeMilestone(await request('milestones', `${apiBase}/milestones/${encodeURIComponent(id)}`, {
        method: 'PUT', body: { state_event: stateEvent },
      }));
    },
    async deleteEntity({ resource, id }) {
      if (resource !== 'wiki') {
        throw new PlanResourceUnavailableError(resource, `${resource} deletion is unavailable on this GitLab edition.`);
      }
      await request('wiki', `${apiBase}/wikis/${encodeURIComponent(id)}`, { method: 'DELETE' });
      wikiFormats.delete(id);
      return true;
    },
    async saveWiki({ id, body }) {
      if (permissions.wiki === false) throw new Error('Wiki changes are unavailable for your current project access.');
      const format = wikiFormats.get(id);
      if (!format) throw new Error('Wiki format is unavailable. Reload the page before saving.');
      const value = await request('wiki', `${apiBase}/wikis/${encodeURIComponent(id)}`, {
        method: 'PUT', body: { content: body, format },
      });
      if (!value?.slug || typeof value.content !== 'string') throw new Error('The server did not return the saved wiki page. Reload before editing.');
      const normalized = normalizeWikiPage(value);
      wikiFormats.set(normalized.id, normalized.format);
      return normalized;
    },
  };
}

export function createProjectPlanProps(options = {}) {
  const adapter = createProjectPlanAdapter(options);
  const missing = PLAN_ADAPTER_METHODS.filter((method) => typeof adapter[method] !== 'function');
  if (missing.length) throw new Error(`Plan adapter is missing methods: ${missing.join(', ')}`);
  return {
    production: true,
    permissions: options.permissions || {},
    fetchMilestones: adapter.fetchMilestones,
    fetchIterations: adapter.fetchIterations,
    fetchRequirements: adapter.fetchRequirements,
    fetchWikiPages: adapter.fetchWikiPages,
    mutateEntity: adapter.mutateEntity,
    deleteEntity: adapter.deleteEntity,
    saveWiki: adapter.saveWiki,
  };
}

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
    href: entity.web_url || '',
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
