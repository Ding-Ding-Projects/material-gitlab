import Api from '~/api';
import axios from '~/lib/utils/axios_utils';

export const COLUMN_DEFS = Object.freeze([
  { key: 'todo', name: 'To do', dotVar: '--gl-mds-warn' },
  { key: 'doing', name: 'In progress', dotVar: '--gl-mds-info' },
  { key: 'review', name: 'In review', dotVar: '--gl-mds-onprimc' },
  { key: 'done', name: 'Done', dotVar: '--gl-mds-good' },
]);

export const LABEL_TAXONOMY = Object.freeze({
  performance: 'warn', frontend: 'primary', ui: 'info', a11y: 'good', bug: 'error',
  feature: 'primary', search: 'info', ci: 'warn', backend: 'neutral',
});

export const ALL_LABELS = Object.freeze(Object.keys(LABEL_TAXONOMY));

export function labelToken(name) {
  const category = LABEL_TAXONOMY[name] || 'neutral';
  return { name, bg: `var(--gl-mds-label-${category}-bg)`, fg: `var(--gl-mds-label-${category}-fg)` };
}

export function avatarInitials(name) {
  return String(name || '').split(' ').filter(Boolean).map((word) => word[0]).join('').toUpperCase();
}

const normalizeLabel = (label) => (typeof label === 'string' ? label : label?.name);

export function normalizeIssue(raw = {}) {
  const labels = Array.isArray(raw.labels) ? raw.labels.map(normalizeLabel).filter(Boolean) : [];
  const assignees = Array.isArray(raw.assignees) ? raw.assignees.filter(Boolean) : raw.assignee ? [raw.assignee] : [];
  const assignee = assignees[0] || null;
  const state = String(raw.state || '').toLowerCase() === 'closed' ? 'Closed' : 'Open';
  const column = raw.board_list_id ?? raw.list_id ?? raw.column ?? (state === 'Closed' ? 'done' : 'todo');

  return {
    ...raw,
    id: raw.id ?? raw.iid,
    iid: raw.iid ?? raw.id,
    title: String(raw.title || ''),
    body: String(raw.description ?? raw.body ?? ''),
    state,
    col: String(column),
    boardListId: raw.board_list_id ?? raw.list_id ?? null,
    labels,
    assignee: assignee?.name || assignee?.username || '',
    assigneeId: assignee?.id ?? null,
    assignees: assignees.map((person) => ({ id: person.id, name: person.name || person.username || '' })),
    opened: raw.created_at || raw.updated_at || 'unknown',
    permissions: raw.permissions || null,
  };
}

function currentProjectId() {
  return globalThis.gon?.current_project_id || globalThis.gl?.snowplowStandardContext?.data?.project_id || globalThis.gl?.project_id || null;
}

function apiUrl(path, projectId) {
  if (typeof globalThis.gon?.api_version === 'string') {
    return Api.buildUrl(path).replace(':id', encodeURIComponent(projectId));
  }
  const root = globalThis.gon?.relative_url_root || '';
  return `${root}/api/v4/projects/${encodeURIComponent(projectId)}/issues`;
}

function errorFor(error, fallback) {
  const wrapped = new Error(String(error?.response?.data?.message || error?.response?.data?.error || error?.message || fallback));
  wrapped.status = error?.response?.status;
  wrapped.response = error?.response;
  return wrapped;
}

function paginationFrom(response, { page = 1, perPage = 20 } = {}) {
  const headers = response?.headers || {};
  return {
    page: Number(headers['x-page'] || page),
    perPage: Number(headers['x-per-page'] || perPage),
    total: headers['x-total'] ? Number(headers['x-total']) : null,
    totalPages: headers['x-total-pages'] ? Number(headers['x-total-pages']) : null,
    hasNextPage: headers['x-next-page'] !== undefined ? Boolean(headers['x-next-page']) : headers['x-total-pages'] ? page < Number(headers['x-total-pages']) : response?.data?.length === perPage,
  };
}

function issuePath(projectId, iid) {
  return `${apiUrl('/api/:version/projects/:id/issues', projectId)}/${encodeURIComponent(iid)}`;
}

function updatePayload(patch = {}) {
  const payload = { ...patch };
  delete payload.assignee;
  delete payload.assigneeId;
  delete payload.col;
  delete payload.boardListId;
  delete payload.state;
  if (Array.isArray(patch.labels)) payload.labels = patch.labels.join(',');
  if (patch.assigneeId !== undefined) payload.assignee_ids = patch.assigneeId == null ? [] : [patch.assigneeId];
  if (patch.state) payload.state_event = patch.state === 'Closed' ? 'close' : 'reopen';
  if (patch.boardListId !== undefined) payload.move_to_id = patch.boardListId;
  return payload;
}

export function createGitLabIssuesAdapter({ projectId = currentProjectId(), http = axios, permissions = {} } = {}) {
  if (projectId === null || projectId === undefined || projectId === '') {
    throw new Error('Issues surface requires a real project adapter and project id');
  }

  const byId = new Map();
  const requirePermission = (name) => {
    if (permissions?.[name] !== true) throw new Error('This issue action is unavailable for your current project access.');
  };
  const acceptIssue = (raw) => {
    if (!raw?.id || !raw?.iid || typeof raw.title !== 'string' || !['opened', 'closed'].includes(raw.state)) throw new Error('The server returned an invalid issue.');
    const issue = normalizeIssue(raw);
    byId.set(issue.id, issue.iid);
    return issue;
  };
  const listPage = async ({ page = 1, perPage = 20, state = 'all', scope = 'all', search = '' } = {}) => {
    try {
      const response = await http.get(apiUrl('/api/:version/projects/:id/issues', projectId), {
        params: { page, per_page: perPage, state, scope, ...(search ? { search } : {}) },
      });
      if (!Array.isArray(response.data)) throw new Error('The server returned an invalid issues list.');
      const issues = response.data.map(acceptIssue);
      return { issues, pagination: paginationFrom(response, { page, perPage }) };
    } catch (error) {
      throw errorFor(error, 'Unable to load issues');
    }
  };

  return {
    async list(options) {
      return (await listPage(options)).issues;
    },
    listPage,
    async create({ title, body = '', labels = [], assigneeId = null, state = 'Open' } = {}) {
      requirePermission('create');
      if (!String(title || '').trim()) throw new Error('Issue title is required');
      try {
        const response = await http.post(apiUrl('/api/:version/projects/:id/issues', projectId), {
          title: String(title).trim(), description: String(body || ''),
          labels: Array.isArray(labels) ? labels.join(',') : labels,
          ...(assigneeId == null ? {} : { assignee_ids: [assigneeId] }),
          ...(state === 'Closed' ? { state_event: 'close' } : {}),
        });
        return acceptIssue(response.data);
      } catch (error) {
        throw errorFor(error, 'Unable to create issue');
      }
    },
    async update(id, patch = {}) {
      requirePermission('update');
      const iid = byId.get(id) || id;
      try {
        const response = await http.put(issuePath(projectId, iid), updatePayload(patch));
        const issue = acceptIssue(response.data);
        if (patch.state && issue.state !== patch.state) throw new Error('The server did not confirm the requested issue state.');
        return issue;
      } catch (error) {
        throw errorFor(error, 'Unable to update issue');
      }
    },
    async moveToBoardList(id, boardListId) {
      if (boardListId === 'done' || boardListId === 'todo') {
        return this.update(id, { state: boardListId === 'done' ? 'Closed' : 'Open' });
      }
      if (!/^\d+$/.test(String(boardListId))) {
        throw new Error('Issue board move needs a real board-list id from GitLab');
      }
      throw new Error('Use the project board to move issues between its configured lists.');
    },
    async remove(ids) {
      requirePermission('delete');
      const values = Array.isArray(ids) ? ids : [ids];
      try {
        await Promise.all(values.map((id) => http.delete(issuePath(projectId, byId.get(id) || id))));
        return true;
      } catch (error) {
        throw errorFor(error, 'Unable to delete issue');
      }
    },
  };
}

/** Production factory: no seeded or in-memory fallback is permitted. */
export function createIssuesApi({ projectId = currentProjectId(), adapter = null, http = axios, permissions = {} } = {}) {
  if (adapter) return adapter;
  return createGitLabIssuesAdapter({ projectId, http, permissions });
}

export function currentUser() {
  return globalThis.gon?.current_user || globalThis.gl?.current_user || null;
}

// Kept as empty compatibility exports; production code must use API data.
export const CURRENT_USER = '';
export const ASSIGNABLE_PEOPLE = Object.freeze([]);
