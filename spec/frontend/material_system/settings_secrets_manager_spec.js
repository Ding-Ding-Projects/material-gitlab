import { createSecretsManagerSettingsAdapter } from '~/material_system/surfaces/Settings/secrets_manager_settings_adapter';
// Shaped to match the real module (`app/assets/javascripts/lib/utils/csrf.js`), which has only
// a default export. A mock with a bare top-level `token` property would also satisfy the broken
// `import { token as csrfToken } from '~/lib/utils/csrf'` named import, hiding the exact webpack
// failure this regression exists to catch.
jest.mock('~/lib/utils/csrf', () => ({
  __esModule: true,
  default: { token: 'mock-csrf-token', headerKey: 'X-CSRF-Token' },
}));
const response = (body) => ({ ok: true, status: 200, json: jest.fn().mockResolvedValue(body) });
const metadata = { available: true, allowed: true, full_path: 'group/project', top_level_group_full_path: 'group', graphql_endpoint: '/api/graphql' };
describe('Secrets Manager design adapter', () => {
  it('retains uppercase lifecycle status and does not select secret values', async () => {
    const fetchImpl = jest.fn().mockResolvedValueOnce(response({ data: { secretsManager: { status: 'ACTIVE' } } })).mockResolvedValueOnce(response({ data: { openbaoHealth: true } })).mockResolvedValueOnce(response({ data: { group: { secretsManagerEntitlement: null } } })).mockResolvedValueOnce(response({ data: { secretsPermissions: { nodes: [] } } }));
    const adapter = createSecretsManagerSettingsAdapter({ metadata, fetchImpl });
    await expect(adapter.load()).resolves.toMatchObject({ status: 'ACTIVE', healthy: true, permissions: [] });
    expect(JSON.parse(fetchImpl.mock.calls[0][1].body).query).not.toMatch(/\bvalue\b/i);
  });
  it('rejects malformed lifecycle metadata instead of inferring inactive', async () => {
    const adapter = createSecretsManagerSettingsAdapter({ metadata, fetchImpl: jest.fn().mockResolvedValue(response({ data: { secretsManager: {} } })) });
    await expect(adapter.load()).rejects.toThrow('lifecycle status');
  });

  it('treats an explicit null lifecycle as uninitialized, preserving the existing service contract', async () => {
    const fetchImpl = jest.fn().mockResolvedValueOnce(response({ data: { secretsManager: null } })).mockResolvedValueOnce(response({ data: { openbaoHealth: true } })).mockResolvedValueOnce(response({ data: { group: { secretsManagerEntitlement: null } } }));
    const adapter = createSecretsManagerSettingsAdapter({ metadata, fetchImpl });
    await expect(adapter.load()).resolves.toMatchObject({ status: 'INACTIVE', healthy: true });
    expect(fetchImpl).toHaveBeenCalledTimes(3);
    fetchImpl.mockResolvedValueOnce(response({ data: { projectSecretsManagerInitialize: { errors: [], projectSecretsManager: { status: 'PROVISIONING' } } } }));
    await expect(adapter.setEnabled(true)).resolves.toBe('PROVISIONING');
  });

  it('does not provision with an unhealthy service or blocked entitlement', async () => {
    const fetchImpl = jest.fn().mockResolvedValueOnce(response({ data: { secretsManager: null } })).mockResolvedValueOnce(response({ data: { openbaoHealth: false } })).mockResolvedValueOnce(response({ data: { group: { secretsManagerEntitlement: null } } }));
    const adapter = createSecretsManagerSettingsAdapter({ metadata, fetchImpl });
    await adapter.load();
    await expect(adapter.setEnabled(true)).rejects.toThrow('available project lifecycle');
    expect(fetchImpl).toHaveBeenCalledTimes(3);
  });

  it('requires a selected eligible user and validated scopes before creating permission', async () => {
    const fetchImpl = jest.fn().mockResolvedValueOnce(response({ data: { project: { projectMembers: { nodes: [{ user: { id: 'gid://gitlab/User/8', name: 'Member', username: 'member' } }] } } } }));
    const adapter = createSecretsManagerSettingsAdapter({ metadata, fetchImpl });
    await expect(adapter.createPermission({ principal: { type: 'USER', id: 'gid://gitlab/User/8' }, actions: ['READ'] })).rejects.toThrow('member returned');
    await adapter.searchMembers('member');
    fetchImpl.mockResolvedValueOnce(response({ data: { secretsPermissionUpdate: { errors: [], secretsPermission: { principal: { id: 8, type: 'USER' }, actions: ['READ'] } } } }));
    await expect(adapter.createPermission({ principal: { type: 'USER', id: 'gid://gitlab/User/8' }, actions: ['READ'] })).resolves.toMatchObject({ principal: { id: 8 } });
    const variables = JSON.parse(fetchImpl.mock.calls[1][1].body).variables;
    expect(variables).toMatchObject({ principal: { id: 8, type: 'USER' }, actions: ['READ'] });
    await expect(adapter.createPermission({ principal: { type: 'ROLE', id: 50 }, actions: ['READ'] })).rejects.toThrow('Reporter');
    await expect(adapter.createPermission({ principal: { type: 'ROLE', id: 20 }, actions: ['ADMIN'] })).rejects.toThrow('supported access scopes');
  });

  it('does not claim deletion when the mutation result is missing', async () => {
    const fetchImpl = jest.fn().mockResolvedValue(response({ data: {} }));
    const adapter = createSecretsManagerSettingsAdapter({ metadata, fetchImpl });
    await expect(adapter.deletePermission({ id: 8, type: 'USER' })).rejects.toThrow('did not confirm');
  });

  it('sends the real CSRF token as the X-CSRF-Token header on every GraphQL request', async () => {
    const fetchImpl = jest.fn().mockResolvedValueOnce(response({ data: { secretsManager: { status: 'ACTIVE' } } })).mockResolvedValueOnce(response({ data: { openbaoHealth: true } })).mockResolvedValueOnce(response({ data: { group: { secretsManagerEntitlement: null } } })).mockResolvedValueOnce(response({ data: { secretsPermissions: { nodes: [] } } }));
    const adapter = createSecretsManagerSettingsAdapter({ metadata, fetchImpl });
    await adapter.load();
    expect(fetchImpl).toHaveBeenCalledWith(
      '/api/graphql',
      expect.objectContaining({
        headers: expect.objectContaining({ 'X-CSRF-Token': 'mock-csrf-token' }),
      }),
    );
  });
});
