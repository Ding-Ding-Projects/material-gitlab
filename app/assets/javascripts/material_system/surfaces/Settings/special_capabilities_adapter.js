import { token as csrfToken } from '~/lib/utils/csrf';

export const CI_CATALOG_QUERY = `query MaterialSettingsCiCatalog($fullPath: ID!) {
  project(fullPath: $fullPath) { id isCatalogResource description }
}`;
export const CI_CATALOG_CREATE = `mutation MaterialSettingsCatalogCreate($input: CatalogResourcesCreateInput!) {
  catalogResourcesCreate(input: $input) { errors }
}`;
export const CI_CATALOG_DESTROY = `mutation MaterialSettingsCatalogDestroy($input: CatalogResourcesDestroyInput!) {
  catalogResourcesDestroy(input: $input) { errors }
}`;
export const SECRETS_STATUS_QUERY = `query MaterialSettingsProjectSecretsManager($fullPath: ID!) {
  secretsManager: projectSecretsManager(projectPath: $fullPath) { status entity: project { id archived markedForDeletion } }
}`;
export const SECRETS_ENROLLMENT_QUERY = `query MaterialSettingsNamespaceSecretsEnrollment($fullPath: ID!) {
  namespaceSecretsManagerEnrollment(namespacePath: $fullPath) { namespace { id } }
}`;
export const SECRETS_ENABLE = `mutation MaterialSettingsEnableSecretsManager($fullPath: ID!) {
  projectSecretsManagerInitialize(input: { projectPath: $fullPath }) { errors projectSecretsManager { status } }
}`;
export const SECRETS_DISABLE = `mutation MaterialSettingsDisableSecretsManager($fullPath: ID!) {
  projectSecretsManagerDeprovision(input: { projectPath: $fullPath }) { errors projectSecretsManager { status } }
}`;

const localPath = (value) =>
  typeof value === 'string' &&
  value.startsWith('/') &&
  !value.startsWith('//') &&
  !/[\u0000-\u0020\\]/.test(value);
const fail = (message) => {
  throw new Error(message);
};

export function createSpecialCapabilitiesAdapter({
  metadata = {},
  graphqlEndpoint = metadata.graphql_endpoint,
  fetchImpl = globalThis.fetch,
} = {}) {
  const request = async (url, { method = 'POST', body } = {}) => {
    if (!localPath(url)) fail('Settings endpoints must be local paths.');
    const response = await fetchImpl(url, {
      method,
      credentials: 'same-origin',
      redirect: 'error',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        'X-CSRF-Token': csrfToken,
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    if (!response.ok)
      fail(
        `Settings request failed (${response.status}). Check project access and the submitted fields, then retry.`,
      );
    return response.status === 204 ? null : response.json();
  };
  const graphql = async (query, variables) => {
    const body = await request(graphqlEndpoint, { body: { query, variables } });
    if (body?.errors?.length)
      fail('Settings metadata is unavailable for your current project access.');
    return body?.data || {};
  };
  const mutation = async (query, variables, key) => {
    const result = await graphql(query, variables);
    const errors = result?.[key]?.errors;
    if (!result?.[key] || !Array.isArray(errors) || errors.length)
      fail('The server could not apply this setting. Refresh and try again.');
    return result[key];
  };
  const catalogAllowed = () =>
    metadata.ci_catalog?.available === true && typeof metadata.ci_catalog?.full_path === 'string';
  const secretsAllowed = () =>
    metadata.secrets_manager?.available === true &&
    metadata.secrets_manager?.allowed === true &&
    typeof metadata.secrets_manager?.full_path === 'string';
  const groupSearchAllowed = () =>
    metadata.bot_access?.available === true &&
    localPath(metadata.bot_access?.group_search_endpoint);

  return {
    async loadCatalog() {
      if (!catalogAllowed()) fail('CI/CD Catalog is unavailable for your current project access.');
      const project = (await graphql(CI_CATALOG_QUERY, { fullPath: metadata.ci_catalog.full_path }))
        .project;
      if (!project?.id)
        fail('CI/CD Catalog metadata is unavailable for your current project access.');
      return {
        enabled: Boolean(project.isCatalogResource),
        description: String(project.description || ''),
      };
    },
    async setCatalog(enabled) {
      if (!catalogAllowed()) fail('CI/CD Catalog is unavailable for your current project access.');
      if (typeof enabled !== 'boolean') fail('CI/CD Catalog state must be enabled or disabled.');
      return mutation(
        enabled ? CI_CATALOG_CREATE : CI_CATALOG_DESTROY,
        { input: { projectPath: metadata.ci_catalog.full_path } },
        enabled ? 'catalogResourcesCreate' : 'catalogResourcesDestroy',
      );
    },
    async loadSecrets() {
      if (metadata.secrets_manager?.available !== true)
        return { available: false, status: 'inactive', enrolled: false };
      const statusData = await graphql(SECRETS_STATUS_QUERY, {
        fullPath: metadata.secrets_manager.full_path,
      });
      if (!statusData.secretsManager || typeof statusData.secretsManager.status !== 'string')
        fail('Secrets Manager lifecycle metadata is unavailable. Refresh and try again.');
      let enrolled = false;
      if (metadata.secrets_manager.enrollment_available === true) {
        const enrollment = await graphql(SECRETS_ENROLLMENT_QUERY, {
          fullPath: metadata.secrets_manager.full_path,
        });
        enrolled = Boolean(enrollment.namespaceSecretsManagerEnrollment?.namespace?.id);
      }
      return {
        available: true,
        status: statusData.secretsManager.status,
        enrolled,
        entity: statusData.secretsManager?.entity || null,
      };
    },
    async setSecrets(enabled) {
      if (!secretsAllowed())
        fail('Secrets Manager is unavailable for your current project access.');
      const result = await mutation(
        enabled ? SECRETS_ENABLE : SECRETS_DISABLE,
        { fullPath: metadata.secrets_manager.full_path },
        enabled ? 'projectSecretsManagerInitialize' : 'projectSecretsManagerDeprovision',
      );
      if (typeof result.projectSecretsManager?.status !== 'string')
        fail(
          'The server did not confirm the Secrets Manager lifecycle status. Refresh and try again.',
        );
      return { status: result.projectSecretsManager.status };
    },
    async searchBotGroups(query = '') {
      if (!groupSearchAllowed()) fail('Allowed groups are unavailable for this project.');
      const url = new URL(
        metadata.bot_access.group_search_endpoint,
        globalThis.location?.origin || 'http://localhost',
      );
      url.searchParams.set('search', String(query));
      url.searchParams.set('per_page', '20');
      const rows = await request(`${url.pathname}${url.search}`, { method: 'GET' });
      if (!Array.isArray(rows))
        fail('Allowed group metadata is unavailable. Refresh and try again.');
      return rows
        .map((group) => ({
          id: group.id,
          name: group.name || group.full_path || '',
          fullPath: group.full_path || '',
        }))
        .filter((group) => Number.isInteger(group.id) && group.name);
    },
  };
}
