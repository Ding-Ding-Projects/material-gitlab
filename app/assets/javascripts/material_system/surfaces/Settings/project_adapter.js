import { assertSettingsAdapter, normalizeSettingsState } from './adapter';

// Deliberately omit `value`: opening Settings must not retrieve CI secrets.
export const VARIABLE_METADATA_QUERY = `query MaterialSettingsVariables($fullPath: ID!, $after: String) {
  project(fullPath: $fullPath) {
    ciVariables(first: 100, after: $after) {
      nodes { id key environmentScope protected hidden masked }
      pageInfo { hasNextPage endCursor }
    }
  }
}`;

export const PROJECT_METADATA_QUERY = `query MaterialSettingsProject($fullPath: ID!) {
  project(fullPath: $fullPath) { id name visibility avatarUrl }
}`;

const ACCESS_LEVELS = Object.freeze({ Guest: 10, Planner: 15, Reporter: 20, Developer: 30, Maintainer: 40 });
const roleName = (level) => Object.keys(ACCESS_LEVELS).find((name) => ACCESS_LEVELS[name] === level) || `Access level ${level}`;
const visibilityName = (value) => ({ private: 'Private', internal: 'Internal', public: 'Public' })[value] || '';

/** Existing authenticated REST/GraphQL services remain the authority for every action. */
export function createProjectSettingsAdapter({ projectId, fullPath, projectEndpoint, apiBase = '/api/v4', graphqlEndpoint = '/api/graphql', permissions = {}, root = document, fetchImpl = globalThis.fetch } = {}) {
  if (!projectId || !fullPath) throw new Error('Settings requires the current project identity');
  const base = `${apiBase.replace(/\/$/, '')}/projects/${encodeURIComponent(projectId)}`;
  let variables = [];
  const requirePermission = (key) => {
    if (permissions[key] !== true) throw new Error('This settings action is unavailable for your current project access.');
  };
  const request = async (url, { method = 'GET', body, form = false } = {}) => {
    if (!url || !url.startsWith('/') || url.startsWith('//') || /[\u0000-\u0020\\]/.test(url)) throw new Error('Settings endpoints must be local paths');
    const csrf = root?.querySelector('meta[name="csrf-token"]')?.content;
    const response = await fetchImpl(url, {
      method, credentials: 'same-origin', redirect: 'error',
      headers: { Accept: 'application/json', 'X-Requested-With': 'XMLHttpRequest', ...(csrf ? { 'X-CSRF-Token': csrf } : {}), ...(body && !form ? { 'Content-Type': 'application/json' } : {}) },
      ...(body ? { body: form ? body : JSON.stringify(body) } : {}),
    });
    if (!response.ok) {
      // Do not reflect server bodies which may echo submitted secret values.
      const error = new Error(`Settings request failed (${response.status}). Check project access and the submitted fields, then retry.`);
      error.status = response.status;
      throw error;
    }
    if (response.status === 204) return null;
    return response.json();
  };
  const list = async (path) => {
    const rows = [];
    for (let page = 1; page <= 100; page += 1) {
      const body = await request(`${base}/${path}?per_page=100&page=${page}`);
      if (!Array.isArray(body)) throw new Error('Settings service returned an invalid list');
      rows.push(...body);
      if (body.length < 100) return rows;
    }
    throw new Error('Settings list exceeds the supported page limit. Use the dedicated settings editor.');
  };
  const loadVariables = async () => {
    if (!permissions.variables) return [];
    const rows = [];
    let after = null;
    for (let page = 0; page < 100; page += 1) {
      const body = await request(graphqlEndpoint, { method: 'POST', body: { query: VARIABLE_METADATA_QUERY, variables: { fullPath, after } } });
      const connection = body?.data?.project?.ciVariables;
      if (body?.errors?.length || !Array.isArray(connection?.nodes)) throw new Error('Variable metadata is unavailable for your current project access.');
      rows.push(...connection.nodes.map((item) => ({ id: item.id, key: item.key, environmentScope: item.environmentScope, protected: item.protected, hidden: item.hidden, maskedValue: '••••••••', revealed: false, value: '' })));
      if (!connection.pageInfo?.hasNextPage) { variables = rows; return rows; }
      if (!connection.pageInfo.endCursor || connection.pageInfo.endCursor === after) throw new Error('Variable metadata pagination did not advance');
      after = connection.pageInfo.endCursor;
    }
    throw new Error('Variable list exceeds the supported page limit. Use the dedicated settings editor.');
  };
  const variablePath = (id) => {
    const item = variables.find((variable) => variable.id === id);
    if (!item) throw new Error('Refresh settings before changing this variable.');
    return `${base}/variables/${encodeURIComponent(item.key)}?filter%5Benvironment_scope%5D=${encodeURIComponent(item.environmentScope || '*')}`;
  };
  const members = async () => (await list('members')).map((item) => ({ id: item.id, name: item.name, handle: item.username, role: roleName(item.access_level) }));
  const branches = async () => (await list('protected_branches')).map((item) => ({ id: item.name, name: item.name, merge: item.merge_access_levels.map((access) => access.access_level_description).join(', '), push: item.push_access_levels.map((access) => access.access_level_description).join(', ') }));
  const loadProject = async () => {
    const body = await request(graphqlEndpoint, { method: 'POST', body: { query: PROJECT_METADATA_QUERY, variables: { fullPath } } });
    const item = body?.data?.project;
    if (body?.errors?.length || !item?.id || typeof item.name !== 'string') throw new Error('Project settings response is invalid');
    return { projectName: item.name, visibility: visibilityName(item.visibility), logoUrl: item.avatarUrl || '' };
  };
  const adapter = {
    async load() {
      const project = await loadProject();
      const state = { ...project, permissions, members: [], variables: [], protectedBranches: [], integrations: [], errors: [] };
      const resources = [
        ['members', permissions.members, members],
        ['variables', permissions.variables, loadVariables],
        ['protectedBranches', permissions.branches, branches],
        ['integrations', permissions.integrations, async () => (await list('integrations')).map((item) => ({ id: item.slug, name: item.title, desc: 'Active integration. Configure it in the dedicated editor.', on: item.active }))],
      ];
      await Promise.all(resources.map(async ([key, allowed, loader]) => {
        if (!allowed) { state.errors.push(`${key}: unavailable for your current project access.`); return; }
        try { state[key] = await loader(); } catch (error) { state.errors.push(`${key}: ${error.message}`); }
      }));
      return { ...normalizeSettingsState(state), logoUrl: state.logoUrl };
    },
    async updateProject(changes) {
      requirePermission('project');
      const body = {};
      if (typeof changes.name === 'string' && changes.name.trim()) body.name = changes.name;
      if (changes.visibility) {
        const visibility = changes.visibility.toLowerCase();
        if (!['private', 'internal', 'public'].includes(visibility)) throw new Error('Choose a supported project visibility.');
        body.visibility_level = { private: 0, internal: 10, public: 20 }[visibility];
      }
      if (!Object.keys(body).length || 'logoColor' in changes) throw new Error('This project setting is not supported by the project API.');
      await request(projectEndpoint, { method: 'PUT', body: { project: body } });
      return loadProject();
    },
    async updateLogo(file) {
      requirePermission('project');
      if (!file) throw new Error('Choose a local avatar image.');
      const form = new FormData();
      form.append('project[avatar]', file);
      await request(projectEndpoint, { method: 'PUT', body: form, form: true });
      return loadProject();
    },
    async updateMemberRole({ id, role }) {
      requirePermission('members');
      if (!ACCESS_LEVELS[role]) throw new Error('That role cannot be assigned to a direct project member.');
      await request(`${base}/members/${encodeURIComponent(id)}`, { method: 'PUT', body: { access_level: ACCESS_LEVELS[role] } });
      return { members: await members() };
    },
    async removeMembers(ids) {
      requirePermission('members');
      for (const id of ids) await request(`${base}/members/${encodeURIComponent(id)}`, { method: 'DELETE' });
      return { members: await members() };
    },
    async createVariable(payload) {
      requirePermission('variables');
      if (!payload?.key || typeof payload.value !== 'string') throw new Error('A variable key and value are required.');
      await request(`${base}/variables`, { method: 'POST', body: { key: payload.key, value: payload.value, environment_scope: payload.environment_scope || '*', protected: Boolean(payload.protected), masked: Boolean(payload.masked) } });
      return { variables: await loadVariables() };
    },
    async revealVariable(id) {
      requirePermission('variables');
      const item = variables.find((variable) => variable.id === id);
      if (!item || item.hidden) throw new Error('Hidden variables cannot be revealed.');
      if (item.revealed) { variables = variables.map((entry) => entry.id === id ? { ...entry, revealed: false, value: '' } : entry); }
      else {
        const body = await request(variablePath(id));
        if (typeof body?.value !== 'string') throw new Error('This variable value is unavailable.');
        variables = variables.map((entry) => entry.id === id ? { ...entry, revealed: true, value: body.value } : entry);
      }
      return { variables };
    },
    async removeVariables(ids) {
      requirePermission('variables');
      for (const id of ids) await request(variablePath(id), { method: 'DELETE' });
      return { variables: await loadVariables() };
    },
    async unprotectBranches(ids) {
      requirePermission('branches');
      for (const id of ids) await request(`${base}/protected_branches/${encodeURIComponent(id)}`, { method: 'DELETE' });
      return { protectedBranches: await branches() };
    },
    async toggleIntegration() { throw new Error('Use the integration editor to validate its required configuration.'); },
    async bulkToggleIntegrations() { throw new Error('Integration configuration must be changed in each dedicated editor.'); },
  };
  return assertSettingsAdapter(adapter);
}
