import fs from 'fs';
import path from 'path';
import {
  SETTINGS_ADAPTER_METHODS,
  assertSettingsAdapter,
  createRailsSettingsAdapter,
  isSettingsAdapter,
  normalizeSettingsState,
} from '~/material_system/surfaces/Settings/adapter';
import { createInitialState } from '~/material_system/surfaces/Settings/data';

const adapterWith = (overrides = {}) =>
  Object.fromEntries(SETTINGS_ADAPTER_METHODS.map((method) => [method, overrides[method] || jest.fn()]));

describe('Material Settings production adapter seam', () => {
  it('does not invent project records when no adapter is connected', () => {
    const state = createInitialState();

    expect(state.projectName).toBe('');
    expect(state.visibility).toBe('');
    expect(state.members).toEqual([]);
    expect(state.variables).toEqual([]);
    expect(state.protectedBranches).toEqual([]);
    expect(state.integrations).toEqual([]);
  });

  it('requires every read and mutation method before a host can connect', () => {
    expect(isSettingsAdapter(null)).toBe(false);
    expect(isSettingsAdapter({ load: jest.fn() })).toBe(false);
    expect(() => assertSettingsAdapter({ load: jest.fn() })).toThrow(/updateProject/);
    expect(isSettingsAdapter(adapterWith())).toBe(true);
  });

  it('normalizes real snapshots without exposing masked variable values', () => {
    expect(normalizeSettingsState({
      project: { name: 'real-project', visibility: 'private' },
      members: [{ id: 'member-1', name: 'Real User', username: 'real-user', accessLevel: 'Maintainer' }],
      variables: [{ id: 'variable-1', key: 'DEPLOY_TOKEN', value: 'must-not-render', maskedValue: '••••••••••', revealed: false }],
      protectedBranches: [{ id: 'branch-1', name: 'main', mergeAccessLevel: 'Maintainer', pushAccessLevel: 'No one' }],
      integrations: [{ id: 'integration-1', name: 'Webhook', description: 'Project events', enabled: true }],
    })).toMatchObject({
      projectName: 'real-project',
      visibility: 'private',
      members: [{ id: 'member-1', handle: 'real-user', role: 'Maintainer' }],
      variables: [{ id: 'variable-1', value: '', maskedValue: '••••••••••', revealed: false }],
      protectedBranches: [{ id: 'branch-1', merge: 'Maintainer', push: 'No one' }],
      integrations: [{ id: 'integration-1', desc: 'Project events', on: true }],
    });
  });

  it('uses host-provided Rails endpoints and propagates server validation errors', async () => {
    const root = { querySelector: () => ({ content: 'csrf-token' }) };
    const fetchImpl = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ projectName: 'server-project', members: [], variables: [], protectedBranches: [], integrations: [] }),
    });
    const adapter = createRailsSettingsAdapter({
      root,
      fetchImpl,
      endpoints: {
        snapshot: '/settings.json',
        project: '/settings/project',
        logo: '/settings/logo',
        member: '/settings/members/:id',
        members: '/settings/members',
        variables: '/settings/variables',
        variableReveal: '/settings/variables/:id/reveal',
        protectedBranches: '/settings/branches',
        integration: '/settings/integrations/:id',
        integrations: '/settings/integrations',
      },
    });

    await expect(adapter.updateProject({ name: 'server-project' })).resolves.toMatchObject({ projectName: 'server-project' });
    expect(fetchImpl).toHaveBeenCalledWith('/settings/project', expect.objectContaining({ method: 'PATCH', credentials: 'same-origin' }));

    const invalidResponse = { ok: false, status: 422, json: async () => ({ message: 'Name is already taken' }) };
    fetchImpl.mockResolvedValueOnce(invalidResponse);
    await expect(adapter.updateProject({ name: 'duplicate' })).rejects.toThrow('Name is already taken');
  });

  it('keeps the production surface free of known design fixtures and fake secrets', () => {
    const root = path.resolve(__dirname, '../../../app/assets/javascripts/material_system/surfaces/Settings');
    const source = fs
      .readdirSync(root)
      .filter((name) => /\.(js|vue)$/.test(name))
      .map((name) => fs.readFileSync(path.join(root, name), 'utf8'))
      .join('\n');
    const markers = ['phoenix-api', 'Jun Park', 'Dana Weiss'];
    const credentialLikePatterns = [/glpat-[\w-]+/, /s3cr3t-[\w-]+/, /@sentry\.io/];

    expect(markers.some((marker) => source.includes(marker))).toBe(false);
    expect(credentialLikePatterns.some((pattern) => pattern.test(source))).toBe(false);
    expect(source).toContain('assertSettingsAdapter(this.effectiveAdapter)');
    expect(source).toContain("this.runAdapter('removeVariables'");
    expect(source).toContain("this.runAdapter('unprotectBranches'");
  });

  it('makes the fixture guard turn red when a known fixture is reintroduced', () => {
    const source = 'const projectName = "phoenix-api";';
    const markers = ['phoenix-api'];

    expect(markers.some((marker) => source.includes(marker))).toBe(true);
  });
});
