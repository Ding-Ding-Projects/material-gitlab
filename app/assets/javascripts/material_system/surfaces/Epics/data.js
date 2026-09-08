/**
 * View model for the Epics surface (epic tree + roadmap).
 *
 * Field names deliberately mirror the group epics GraphQL API. The surface
 * never carries a fixture fallback: the server mount must provide `fullPath`
 * and the GraphQL endpoint (or an injected client in tests).
 */

export const EPIC_STATE = Object.freeze({ OPEN: 'opened', CLOSED: 'closed' });

// The roadmap view renders a fixed six-month window, matching the design contract.
export const ROADMAP_MONTHS = Object.freeze(['Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug']);
export const ROADMAP_YEAR = 2026;

const clone = (value) => JSON.parse(JSON.stringify(value));

const EPICS_QUERY = `query materialPlanningEpics($fullPath: ID!, $after: String) {
  group(fullPath: $fullPath) {
    epics(first: 50, after: $after) {
      nodes {
        id iid title state startDate dueDate webUrl confidential
        parent { id }
        descendantCounts { closedIssues openedIssues }
        group { id fullPath fullName }
      }
      pageInfo { hasNextPage endCursor }
    }
  }
}`;

const config = () => {
  if (typeof window === 'undefined') return {};
  if (window.__MATERIAL_EPICS_CONFIG__) return window.__MATERIAL_EPICS_CONFIG__;
  const root = document.querySelector('[data-material-epics]');
  if (!root) return {};
  const encoded = root.dataset.materialEpicsConfig;
  if (!encoded) return { ...root.dataset };
  try {
    return JSON.parse(encoded);
  } catch (_error) {
    throw new Error('Epics route configuration is invalid. Reload the group Epics page.');
  }
};

const localPath = (value, label) => {
  if (!value || typeof value !== 'string' || !value.startsWith('/') || value.startsWith('//') || /[\u0000-\u0020\\]/.test(value)) {
    throw new Error(`${label} must be a local route`);
  }
  return value;
};

const csrfHeaders = () => {
  const csrf = typeof document === 'undefined' ? null : document.querySelector('meta[name="csrf-token"]')?.content;
  return csrf ? { 'X-CSRF-Token': csrf } : {};
};

const requirePermission = (settings, permission) => {
  if (settings.permissions?.[permission] !== true) {
    throw new Error('This Epic action is unavailable for your current group access.');
  }
};

async function graphqlRequest({ endpoint, fullPath, after = null, fetcher }) {
  const request = fetcher || (typeof fetch === 'function' ? fetch : null);
  if (!request) throw new Error('Epics data transport is unavailable');
  const response = await request(localPath(endpoint, 'Epics GraphQL endpoint'), {
    method: 'POST',
    credentials: 'same-origin',
    redirect: 'error',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json', 'X-Requested-With': 'XMLHttpRequest', ...csrfHeaders() },
    body: JSON.stringify({ query: EPICS_QUERY, variables: { fullPath, after } }),
  });
  if (!response.ok) throw new Error(`Epics request failed (${response.status})`);
  const payload = await response.json();
  if (payload.errors?.length) throw new Error(payload.errors.map((error) => error.message).join('; '));
  const connection = payload.data?.group?.epics;
  if (!connection || !Array.isArray(connection.nodes) || typeof connection.pageInfo?.hasNextPage !== 'boolean') {
    throw new Error('Epics response is unavailable or invalid for this group.');
  }
  return connection;
}

export async function loadEpics(options = {}) {
  const settings = { ...config(), ...options };
  const endpoint = settings.endpoint || settings.graphqlEndpoint || '/api/graphql';
  const fullPath = settings.fullPath || settings.groupFullPath;
  if (!fullPath) throw new Error('Epics group path is not configured by the server mount');
  const nodes = [];
  let after = null;
  for (let pageNumber = 0; pageNumber < 100; pageNumber += 1) {
    const page = await graphqlRequest({ endpoint, fullPath, after, fetcher: settings.fetcher });
    nodes.push(...page.nodes.map((item) => {
      if (!item || typeof item.id !== 'string' || !item.id || !Number.isInteger(Number(item.iid)) || Number(item.iid) <= 0 || typeof item.title !== 'string' || !['opened', 'closed'].includes(item.state)) {
        throw new Error('Epics response contains an invalid Epic identity.');
      }
      return {
        ...clone(item),
        routeIid: String(item.iid),
        reference: item.reference || `&${item.iid}`,
        children: item.children || [],
        confidential: Boolean(item.confidential),
      };
    }));
    if (!page.pageInfo?.hasNextPage) return buildEpicTree(nodes);
    if (!page.pageInfo.endCursor || page.pageInfo.endCursor === after) throw new Error('Epics pagination did not advance');
    after = page.pageInfo.endCursor;
  }
  throw new Error('Epic list exceeds the supported page limit. Refine the group scope and retry.');
}

export function buildEpicTree(nodes) {
  const byId = new Map(nodes.map((node) => [node.id, { ...node, children: [] }]));
  if (byId.size !== nodes.length) throw new Error('Epics response contains duplicate global identities.');
  const roots = [];
  byId.forEach((node) => {
    const seen = new Set([node.id]);
    let parent = byId.get(node.parent?.id);
    while (parent) {
      if (seen.has(parent.id)) throw new Error('Epics response contains a cyclic hierarchy.');
      seen.add(parent.id);
      parent = byId.get(parent.parent?.id);
    }
    const directParent = byId.get(node.parent?.id);
    if (directParent) directParent.children.push(node);
    else roots.push(node);
  });
  return roots;
}

export async function mutateEpic({ id, changes, options = {} }) {
  const settings = { ...config(), ...options };
  requirePermission(settings, 'update');
  const endpoint = settings.updateEndpoint || settings.epicUpdateEndpoint;
  if (!endpoint) throw new Error('Epic update route is not configured by the server mount');
  const request = settings.fetcher || (typeof fetch === 'function' ? fetch : null);
  if (!request) throw new Error('Epic mutation transport is unavailable');
  const response = await request(localPath(endpoint, 'Epic update endpoint').replace(/\/$/, '') + `/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    credentials: 'same-origin',
    redirect: 'error',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json', 'X-Requested-With': 'XMLHttpRequest', ...csrfHeaders() },
    body: JSON.stringify(changes),
  });
  if (!response.ok) throw new Error(`Epic update failed (${response.status})`);
  return response.json();
}

export async function deleteEpic({ id, options = {} }) {
  const settings = { ...config(), ...options };
  requirePermission(settings, 'delete');
  const endpoint = settings.deleteEndpoint || settings.epicDeleteEndpoint;
  if (!endpoint) throw new Error('Epic delete route is not configured by the server mount');
  const request = settings.fetcher || (typeof fetch === 'function' ? fetch : null);
  if (!request) throw new Error('Epic mutation transport is unavailable');
  const response = await request(localPath(endpoint, 'Epic delete endpoint').replace(/\/$/, '') + `/${encodeURIComponent(id)}`, {
    method: 'DELETE',
    credentials: 'same-origin',
    redirect: 'error',
    headers: { Accept: 'application/json', 'X-Requested-With': 'XMLHttpRequest', ...csrfHeaders() },
  });
  if (!response.ok) throw new Error(`Epic delete failed (${response.status})`);
  return response.json();
}

export function progressTotal(descendantCounts) {
  return (descendantCounts?.closedIssues ?? 0) + (descendantCounts?.openedIssues ?? 0);
}

export function progressPercent(descendantCounts) {
  const total = progressTotal(descendantCounts);
  if (total <= 0) return 0;
  return Math.round((descendantCounts.closedIssues / total) * 100);
}

/** Flattens the tree into a single list, tagging depth and parent id for callers. */
export function flattenEpics(epics, depth = 0, parentId = null) {
  const out = [];
  epics.forEach((item) => {
    out.push({ ...item, depth, parentId, hasChildren: (item.children || []).length > 0 });
    if (item.children && item.children.length) {
      out.push(...flattenEpics(item.children, depth + 1, item.id));
    }
  });
  return out;
}

/** Text a search query is matched against: reference plus title. */
export function searchableText(item) {
  return `${item.reference} ${item.title}`;
}

/**
 * Clamped 0-based index of a date within the roadmap window, or null when the
 * date falls outside it entirely (defensive against out-of-range API data).
 */
export function monthIndexInWindow(dateString) {
  const date = new Date(`${dateString}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return null;
  const monthsFromWindowStart =
    (date.getUTCFullYear() - ROADMAP_YEAR) * 12 + (date.getUTCMonth() - 2); // window starts in March (month 2)
  if (monthsFromWindowStart < 0) return 0;
  if (monthsFromWindowStart > ROADMAP_MONTHS.length - 1) return ROADMAP_MONTHS.length - 1;
  return monthsFromWindowStart;
}

export function formatMonthRange(startDate, dueDate) {
  const validDate = (value) => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(new Date(`${value}T00:00:00Z`).getTime());
  if (!validDate(startDate) || !validDate(dueDate)) return '';
  return `${startDate} → ${dueDate}`;
}

/** Immutably applies `updater(item)` to every epic (at any depth) whose id is in `ids`. */
export function updateEpicsByIds(epics, ids, updater) {
  const idSet = new Set(ids);
  const walk = (list) =>
    list.map((item) => ({
      ...item,
      ...(idSet.has(item.id) ? updater(item) : null),
      children: walk(item.children || []),
    }));
  return walk(epics);
}

/** Immutably removes every epic (at any depth) whose id is in `ids`. */
export function removeEpicsByIds(epics, ids) {
  const idSet = new Set(ids);
  const walk = (list) =>
    list.filter((item) => !idSet.has(item.id)).map((item) => ({ ...item, children: walk(item.children || []) }));
  return walk(epics);
}

export function roadmapBarGeometry(startDate, dueDate) {
  const startIndex = monthIndexInWindow(startDate) ?? 0;
  const endIndex = monthIndexInWindow(dueDate) ?? startIndex;
  const span = Math.max(1, endIndex - startIndex + 1);
  return {
    leftPercent: (startIndex / ROADMAP_MONTHS.length) * 100,
    widthPercent: (span / ROADMAP_MONTHS.length) * 100,
  };
}
