import { token as csrfToken } from '~/lib/utils/csrf';

export const STATUS_QUERY = `query MaterialSettingsSecretsStatus($fullPath: ID!) { secretsManager: projectSecretsManager(projectPath: $fullPath) { status entity: project { id archived markedForDeletion } } }`;
export const HEALTH_QUERY = 'query MaterialSettingsOpenbaoHealth { openbaoHealth }';
export const ENTITLEMENT_QUERY = `query MaterialSettingsEntitlement($fullPath: ID!) { group(fullPath: $fullPath) { secretsManagerEntitlement { state blockedReason } } }`;
export const ENABLE_MUTATION = `mutation MaterialSettingsSecretsEnable($fullPath: ID!) { projectSecretsManagerInitialize(input: { projectPath: $fullPath }) { errors projectSecretsManager { status } } }`;
export const DISABLE_MUTATION = `mutation MaterialSettingsSecretsDisable($fullPath: ID!) { projectSecretsManagerDeprovision(input: { projectPath: $fullPath }) { errors projectSecretsManager { status } } }`;
export const PERMISSIONS_QUERY = `query MaterialSettingsSecretsPermissions($fullPath: ID!) { secretsPermissions: projectSecretsPermissions(projectPath: $fullPath) { nodes { actions expiredAt principal { id type userRoleId user { id name username } group { id name webUrl } } } } }`;
export const DELETE_PERMISSION = `mutation MaterialSettingsDeleteSecretsPermission($fullPath: ID!, $principal: PrincipalInput!) { secretsPermissionDelete: projectSecretsPermissionDelete(input: { projectPath: $fullPath principal: $principal }) { errors } }`;
export const MEMBERS_QUERY = `query MaterialSettingsSecretsMembers($fullPath: ID!, $search: String) { project(fullPath: $fullPath) { projectMembers(search: $search, accessLevels: [REPORTER, DEVELOPER, MAINTAINER], relations: [DIRECT, INHERITED, INVITED_GROUPS]) { nodes { user { id name username } } } } }`;
export const CREATE_PERMISSION = `mutation MaterialSettingsCreateSecretsPermission($fullPath: ID!, $principal: PrincipalInput!, $actions: [SecretsManagementAction!]!) { secretsPermissionUpdate: projectSecretsPermissionUpdate(input: { projectPath: $fullPath principal: $principal actions: $actions expiredAt: null }) { errors secretsPermission { principal { id type } actions } } }`;

const local = (value) => typeof value === 'string' && value.startsWith('/') && !value.startsWith('//') && !/[\u0000-\u0020\\]/.test(value);
const STATES = new Set(['ACTIVE', 'INACTIVE', 'PROVISIONING', 'DEPROVISIONING']);
const SCOPES = new Set(['READ', 'READ_VALUE', 'WRITE', 'DELETE']);
const principalId = (id) => Number(String(id).split('/').pop());

export function createSecretsManagerSettingsAdapter({ metadata, fetchImpl = globalThis.fetch } = {}) {
  const eligibleUsers = new Set();
  let loadedState = null;
  const allowed = () => {
    if (metadata?.available !== true || metadata?.allowed !== true) throw new Error('Secrets Manager changes are unavailable for your current project access.');
  };
  const gql = async (query, variables = {}) => {
    if (metadata?.available !== true || !metadata.full_path || !local(metadata.graphql_endpoint)) throw new Error('Secrets Manager metadata endpoint is unavailable.');
    const response = await fetchImpl(metadata.graphql_endpoint, { method: 'POST', credentials: 'same-origin', redirect: 'error', headers: { Accept: 'application/json', 'Content-Type': 'application/json', 'X-CSRF-Token': csrfToken }, body: JSON.stringify({ query, variables }) });
    if (!response.ok) throw new Error(`Secrets Manager request failed (${response.status}).`);
    const body = await response.json();
    if (body?.errors?.length || !body?.data || typeof body.data !== 'object') throw new Error('Secrets Manager metadata is unavailable for your current project access.');
    return body.data;
  };
  const mutation = async (query, variables, key) => {
    const data = await gql(query, variables);
    if (!Array.isArray(data[key]?.errors) || data[key].errors.length) throw new Error('The server did not confirm this Secrets Manager update.');
    return data[key];
  };
  const status = (value) => {
    if (!value || !STATES.has(value.status)) throw new Error('Secrets Manager lifecycle status is unavailable.');
    return value.status;
  };
  return {
    async load() {
      const [lifecycle, health, entitlement] = await Promise.all([
        gql(STATUS_QUERY, { fullPath: metadata.full_path }), gql(HEALTH_QUERY),
        metadata.top_level_group_full_path ? gql(ENTITLEMENT_QUERY, { fullPath: metadata.top_level_group_full_path }) : Promise.resolve({}),
      ]);
      if (!Object.prototype.hasOwnProperty.call(lifecycle, 'secretsManager')) throw new Error('Secrets Manager lifecycle status is unavailable.');
      const lifecycleStatus = lifecycle.secretsManager === null ? 'INACTIVE' : status(lifecycle.secretsManager);
      if (typeof health.openbaoHealth !== 'boolean') throw new Error('Secrets service health is unavailable.');
      let permissions = [];
      if (lifecycleStatus === 'ACTIVE') {
        const result = await gql(PERMISSIONS_QUERY, { fullPath: metadata.full_path });
        if (!Array.isArray(result.secretsPermissions?.nodes)) throw new Error('Secrets Manager permissions are unavailable.');
        permissions = result.secretsPermissions.nodes;
      }
      loadedState = { status: lifecycleStatus, healthy: health.openbaoHealth, entitlement: entitlement.group?.secretsManagerEntitlement || null, permissions };
      return loadedState;
    },
    async setEnabled(enabled) {
      allowed();
      if (typeof enabled !== 'boolean' || !loadedState?.healthy || metadata.archived === true || metadata.marked_for_deletion === true) throw new Error('Refresh the available project lifecycle state before changing it.');
      if (metadata.paid_experience === true && ['BLOCKED', 'INELIGIBLE'].includes(loadedState.entitlement?.state)) throw new Error('The current Secrets Manager entitlement blocks provisioning.');
      if ((enabled && loadedState.status !== 'INACTIVE') || (!enabled && loadedState.status !== 'ACTIVE')) throw new Error('The Secrets Manager lifecycle operation is already pending or unavailable.');
      const result = await mutation(enabled ? ENABLE_MUTATION : DISABLE_MUTATION, { fullPath: metadata.full_path }, enabled ? 'projectSecretsManagerInitialize' : 'projectSecretsManagerDeprovision');
      const next = status(result.projectSecretsManager);
      loadedState = { ...loadedState, status: next };
      return next;
    },
    async deletePermission(principal) {
      allowed();
      const id = principalId(principal?.id);
      if (!Number.isInteger(id) || id <= 0 || !['USER', 'GROUP', 'ROLE'].includes(principal?.type)) throw new Error('Choose an existing Secrets Manager principal.');
      await mutation(DELETE_PERMISSION, { fullPath: metadata.full_path, principal: { id, type: principal.type } }, 'secretsPermissionDelete');
    },
    async searchMembers(search = '') {
      allowed();
      const data = await gql(MEMBERS_QUERY, { fullPath: metadata.full_path, search });
      if (!Array.isArray(data.project?.projectMembers?.nodes)) throw new Error('Eligible project members are unavailable.');
      const members = data.project.projectMembers.nodes.map((node) => node.user).filter((user) => user?.id && user.name && user.username);
      members.forEach((user) => eligibleUsers.add(principalId(user.id)));
      return members;
    },
    async createPermission({ principal, actions }) {
      allowed();
      if (!principal || !Array.isArray(actions) || !actions.length || actions.some((action) => !SCOPES.has(action))) throw new Error('Select an existing principal and supported access scopes.');
      if (!['USER', 'GROUP', 'ROLE'].includes(principal.type)) throw new Error('Choose a supported principal type.');
      const normalized = principal.type === 'GROUP' ? { type: 'GROUP', groupPath: principal.groupPath } : { type: principal.type, id: principalId(principal.id) };
      if (principal.type === 'GROUP' && !/^[A-Za-z0-9](?:[A-Za-z0-9._/-]*[A-Za-z0-9])?$/.test(principal.groupPath || '')) throw new Error('Enter a valid group path.');
      if (principal.type === 'USER' && !eligibleUsers.has(normalized.id)) throw new Error('Select a member returned by the project member search.');
      if (principal.type === 'ROLE' && ![20, 30, 40].includes(normalized.id)) throw new Error('Choose Reporter, Developer, or Maintainer.');
      const result = await mutation(CREATE_PERMISSION, { fullPath: metadata.full_path, principal: normalized, actions }, 'secretsPermissionUpdate');
      if (!result.secretsPermission?.principal || !Array.isArray(result.secretsPermission.actions)) throw new Error('The server did not return the created permission.');
      return result.secretsPermission;
    },
  };
}
