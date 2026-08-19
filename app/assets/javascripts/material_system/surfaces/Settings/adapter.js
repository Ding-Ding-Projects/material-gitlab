/**
 * Production adapter seam for the Settings surface.
 *
 * The design reference owns its sample data; the product does not. A host
 * supplies an adapter backed by the existing Rails forms, Vue stores, or
 * GraphQL client. When no adapter is supplied the surface stays empty and
 * reports that it cannot load settings rather than inventing project data.
 */

export const SETTINGS_ADAPTER_METHODS = Object.freeze([
  'load',
  'updateProject',
  'updateLogo',
  'updateMemberRole',
  'removeMembers',
  'createVariable',
  'revealVariable',
  'removeVariables',
  'unprotectBranches',
  'toggleIntegration',
  'bulkToggleIntegrations',
]);

export const SETTINGS_ADAPTER_ERROR = 'Settings data is unavailable. Connect a real settings adapter to continue.';

const arrayOrEmpty = (value) => (Array.isArray(value) ? value : []);

const normalizeMember = (member) => ({
  id: member?.id,
  name: String(member?.name || ''),
  handle: String(member?.handle || member?.username || ''),
  role: String(member?.role || member?.accessLevel || ''),
});

const normalizeVariable = (variable) => ({
  id: variable?.id,
  key: String(variable?.key || ''),
  // Raw values are accepted only when the adapter explicitly marks them as
  // revealed. A normal snapshot should contain a server-provided mask.
  value: variable?.revealed ? String(variable?.value || '') : '',
  maskedValue: String(variable?.maskedValue || ''),
  protected: Boolean(variable?.protected),
  revealed: Boolean(variable?.revealed),
});

const normalizeBranch = (branch) => ({
  id: branch?.id,
  name: String(branch?.name || ''),
  merge: String(branch?.merge || branch?.mergeAccessLevel || ''),
  push: String(branch?.push || branch?.pushAccessLevel || ''),
});

const normalizeIntegration = (integration) => ({
  id: integration?.id,
  name: String(integration?.name || ''),
  icon: String(integration?.icon || 'link'),
  desc: String(integration?.desc || integration?.description || ''),
  on: Boolean(integration?.on ?? integration?.enabled),
});

export function normalizeSettingsState(snapshot = {}) {
  const source = snapshot && typeof snapshot === 'object' ? snapshot : {};
  return {
    projectName: String(source.projectName || source.project?.name || ''),
    visibility: String(source.visibility || source.project?.visibility || ''),
    logoColor: String(source.logoColor || '#6750c4'),
    logoFileName: String(source.logoFileName || source.project?.avatarFileName || ''),
    members: arrayOrEmpty(source.members).map(normalizeMember).filter((member) => member.id && member.name),
    variables: arrayOrEmpty(source.variables).map(normalizeVariable).filter((variable) => variable.id && variable.key),
    protectedBranches: arrayOrEmpty(source.protectedBranches).map(normalizeBranch).filter((branch) => branch.id && branch.name),
    integrations: arrayOrEmpty(source.integrations).map(normalizeIntegration).filter((integration) => integration.id && integration.name),
    permissions: source.permissions && typeof source.permissions === 'object' ? source.permissions : {},
    errors: arrayOrEmpty(source.errors).map((error) => String(error)),
  };
}

export function isSettingsAdapter(adapter) {
  return Boolean(adapter) && SETTINGS_ADAPTER_METHODS.every((method) => typeof adapter[method] === 'function');
}

export function assertSettingsAdapter(adapter) {
  if (!isSettingsAdapter(adapter)) {
    throw new TypeError(`Settings adapter must implement: ${SETTINGS_ADAPTER_METHODS.join(', ')}`);
  }
  return adapter;
}

const csrfToken = (root) => root?.querySelector?.('meta[name="csrf-token"]')?.content || '';

const parseResponse = async (response) => {
  let body = null;
  try {
    body = await response.json();
  } catch (_error) {
    body = null;
  }
  if (!response.ok) {
    const error = new Error(body?.message || body?.error || `Settings request failed (${response.status})`);
    error.status = response.status;
    error.details = body;
    throw error;
  }
  return body;
};

const requestJson = async (fetchImpl, root, url, { method = 'GET', body } = {}) => {
  if (!fetchImpl || !url) throw new Error('Settings adapter request is not configured');
  return parseResponse(await fetchImpl(url, {
    method,
    credentials: 'same-origin',
    headers: {
      Accept: 'application/json',
      ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
      ...(csrfToken(root) ? { 'X-CSRF-Token': csrfToken(root) } : {}),
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  }));
};

const normalizeMutationResult = (body) => {
  if (body == null) return null;
  const normalized = normalizeSettingsState(body);
  const fields = ['projectName', 'visibility', 'logoColor', 'logoFileName', 'members', 'variables', 'protectedBranches', 'integrations', 'permissions', 'errors'];
  const result = {};
  fields.forEach((field) => {
    if (Object.prototype.hasOwnProperty.call(body, field)
      || (field === 'projectName' && body.project?.name != null)
      || (field === 'visibility' && body.project?.visibility != null)) {
      result[field] = normalized[field];
    }
  });
  return result;
};

/**
 * Adapt existing Rails JSON endpoints without teaching the design surface
 * about Rails routes. All URLs are supplied by the host's real view helpers.
 */
export function createRailsSettingsAdapter({ root, endpoints, fetchImpl = globalThis.fetch } = {}) {
  const config = endpoints || {};
  const endpoint = (name) => config[name];
  const idPath = (template, id) => String(template || '').replace(':id', encodeURIComponent(id));

  const adapter = {
    async load() {
      const snapshot = await requestJson(fetchImpl, root, endpoint('snapshot'));
      if (!snapshot) throw new Error('Settings adapter returned no project snapshot');
      return normalizeSettingsState(snapshot);
    },
    async updateProject(changes) {
      return normalizeMutationResult(await requestJson(fetchImpl, root, endpoint('project'), { method: 'PATCH', body: changes }));
    },
    async updateLogo(file) {
      if (!file || typeof FormData === 'undefined') throw new Error('A local logo file is required');
      const form = new FormData();
      form.append('avatar', file);
      const response = await fetchImpl(endpoint('logo'), {
        method: 'POST',
        credentials: 'same-origin',
        headers: csrfToken(root) ? { 'X-CSRF-Token': csrfToken(root), Accept: 'application/json' } : { Accept: 'application/json' },
        body: form,
      });
      return normalizeMutationResult(await parseResponse(response));
    },
    async updateMemberRole({ id, role }) {
      return normalizeMutationResult(await requestJson(fetchImpl, root, idPath(endpoint('member'), id), { method: 'PUT', body: { role } }));
    },
    async removeMembers(ids) {
      return normalizeMutationResult(await requestJson(fetchImpl, root, endpoint('members'), { method: 'DELETE', body: { ids } }));
    },
    async createVariable(payload = {}) {
      return normalizeMutationResult(await requestJson(fetchImpl, root, endpoint('variables'), { method: 'POST', body: payload }));
    },
    async revealVariable(id) {
      return normalizeMutationResult(await requestJson(fetchImpl, root, idPath(endpoint('variableReveal'), id), { method: 'POST' }));
    },
    async removeVariables(ids) {
      return normalizeMutationResult(await requestJson(fetchImpl, root, endpoint('variables'), { method: 'DELETE', body: { ids } }));
    },
    async unprotectBranches(ids) {
      return normalizeMutationResult(await requestJson(fetchImpl, root, endpoint('protectedBranches'), { method: 'DELETE', body: { ids } }));
    },
    async toggleIntegration({ id, on }) {
      return normalizeMutationResult(await requestJson(fetchImpl, root, idPath(endpoint('integration'), id), { method: 'PATCH', body: { enabled: on } }));
    },
    async bulkToggleIntegrations({ ids, on }) {
      return normalizeMutationResult(await requestJson(fetchImpl, root, endpoint('integrations'), { method: 'PATCH', body: { ids, enabled: on } }));
    },
  };

  return assertSettingsAdapter(adapter);
}
