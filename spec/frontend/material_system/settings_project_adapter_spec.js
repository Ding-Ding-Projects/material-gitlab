import { createProjectSettingsAdapter, VARIABLE_METADATA_QUERY } from '~/material_system/surfaces/Settings/project_adapter';

const response = (body, status = 200) => ({ ok: status >= 200 && status < 300, status, json: jest.fn().mockResolvedValue(body) });
const project = { id: 7, name: 'Current project', visibility: 'private', avatarUrl: '/uploads/avatar.png' };
const projectResponse = { data: { project } };
const metadata = (nodes, pageInfo = { hasNextPage: false }) => ({ data: { project: { ciVariables: { nodes, pageInfo } } } });
const variable = { id: 'gid://gitlab/Ci::Variable/9', key: 'RELEASE_KEY', environmentScope: 'production/*', protected: true, hidden: false };

describe('project Settings API adapter', () => {
  let fetchImpl;
  let adapter;
  const setup = (permissions = { project: true, members: true, variables: true, branches: true, integrations: true }) => {
    fetchImpl = jest.fn(async (url, options) => {
      if (url === '/group/project.json') return response({ name: project.name });
      if (url === '/gitlab/api/graphql') return response(JSON.parse(options.body).query.includes('MaterialSettingsProject') ? projectResponse : metadata([variable]));
      if (url.includes('/members?')) return response([{ id: 2, name: 'Member', username: 'member', access_level: 30 }]);
      if (url.includes('/protected_branches?')) return response([{ name: 'release/*', merge_access_levels: [{ access_level_description: 'Maintainers' }], push_access_levels: [{ access_level_description: 'No one' }] }]);
      if (url.includes('/integrations?')) return response([{ id: 4, slug: 'jenkins', title: 'Jenkins', active: true }]);
      return response(null, 204);
    });
    adapter = createProjectSettingsAdapter({ projectId: 7, fullPath: 'group/project', projectEndpoint: '/group/project.json', apiBase: '/gitlab/api/v4', graphqlEndpoint: '/gitlab/api/graphql', root: { querySelector: () => ({ content: 'csrf-value' }) }, permissions, fetchImpl });
  };
  beforeEach(() => setup());

  it('loads actual response shapes and requests no variable values or integration details', async () => {
    await expect(adapter.load()).resolves.toMatchObject({ projectName: 'Current project', visibility: 'Private', logoUrl: '/uploads/avatar.png', members: [{ id: 2, role: 'Developer' }], variables: [{ id: variable.id, value: '', revealed: false, environmentScope: 'production/*' }], protectedBranches: [{ id: 'release/*', push: 'No one' }], integrations: [{ id: 'jenkins', name: 'Jenkins', on: true }] });
    expect(VARIABLE_METADATA_QUERY).not.toMatch(/\bvalue\b/);
    expect(fetchImpl.mock.calls.some(([url]) => url.includes('/variables'))).toBe(false);
    expect(fetchImpl.mock.calls.some(([url]) => url.endsWith('/integrations/jenkins'))).toBe(false);
  });

  it('sends project changes using PUT and REST field values with CSRF', async () => {
    await adapter.updateProject({ visibility: 'Private', name: 'Changed' });
    expect(fetchImpl).toHaveBeenCalledWith('/group/project.json', expect.objectContaining({ method: 'PUT', credentials: 'same-origin', redirect: 'error', body: JSON.stringify({ project: { name: 'Changed', visibility_level: 0 } }), headers: expect.objectContaining({ 'X-CSRF-Token': 'csrf-value' }) }));
    await expect(adapter.updateProject({ logoColor: '#6750c4' })).rejects.toThrow('not supported');
  });

  it('uploads the avatar as multipart without inventing a conversion', async () => {
    const file = new File(['image'], 'avatar.png', { type: 'image/png' });
    await adapter.updateLogo(file);
    const [, options] = fetchImpl.mock.calls[0];
    expect(options.method).toBe('PUT');
    expect(options.body.get('project[avatar]')).toBe(file);
    expect(options.headers['Content-Type']).toBeUndefined();
  });

  it('uses numeric member roles and accepts 204 removal then reloads', async () => {
    await adapter.updateMemberRole({ id: 2, role: 'Maintainer' });
    expect(fetchImpl).toHaveBeenCalledWith('/gitlab/api/v4/projects/7/members/2', expect.objectContaining({ method: 'PUT', body: '{"access_level":40}' }));
    await expect(adapter.removeMembers([2])).resolves.toHaveProperty('members');
    await expect(adapter.updateMemberRole({ id: 2, role: 'Owner' })).rejects.toThrow('cannot be assigned');
  });

  it('retrieves a variable only on explicit reveal and encodes the environment scope', async () => {
    await adapter.load();
    fetchImpl.mockResolvedValueOnce(response({ value: 'explicitly requested value' }));
    await expect(adapter.revealVariable(variable.id)).resolves.toMatchObject({ variables: [{ revealed: true, value: 'explicitly requested value' }] });
    expect(fetchImpl).toHaveBeenLastCalledWith('/gitlab/api/v4/projects/7/variables/RELEASE_KEY?filter%5Benvironment_scope%5D=production%2F*', expect.objectContaining({ method: 'GET' }));
    fetchImpl.mockClear();
    await expect(adapter.revealVariable(variable.id)).resolves.toMatchObject({ variables: [{ revealed: false, value: '' }] });
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('never reveals hidden variables', async () => {
    setup({ variables: true });
    fetchImpl.mockResolvedValueOnce(response(projectResponse)).mockResolvedValueOnce(response(metadata([{ ...variable, hidden: true }])));
    await adapter.load();
    fetchImpl.mockClear();
    await expect(adapter.revealVariable(variable.id)).rejects.toThrow('Hidden variables');
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('deletes the selected variable scope and protected branch name', async () => {
    await adapter.load();
    await adapter.removeVariables([variable.id]);
    expect(fetchImpl).toHaveBeenCalledWith(expect.stringContaining('filter%5Benvironment_scope%5D=production%2F*'), expect.objectContaining({ method: 'DELETE' }));
    await adapter.unprotectBranches(['release/*']);
    expect(fetchImpl).toHaveBeenCalledWith('/gitlab/api/v4/projects/7/protected_branches/release%2F*', expect.objectContaining({ method: 'DELETE' }));
  });

  it('does not reflect a rejected secret payload or mark it saved', async () => {
    fetchImpl.mockResolvedValueOnce(response({ message: 'submitted value: private-value' }, 422));
    await expect(adapter.createVariable({ key: 'KEY', value: 'private-value' })).rejects.toThrow('Settings request failed (422)');
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it('keeps unrelated resources usable when one read is forbidden', async () => {
    setup({ project: true, variables: true });
    fetchImpl.mockResolvedValueOnce(response(projectResponse)).mockResolvedValueOnce(response({}, 403));
    await expect(adapter.load()).resolves.toMatchObject({ projectName: project.name, variables: [], errors: expect.arrayContaining([expect.stringContaining('403')]) });
    await expect(adapter.removeMembers([2])).rejects.toThrow('current project access');
  });

  it('follows GraphQL cursors and REST pages', async () => {
    setup({ variables: true, members: true });
    fetchImpl.mockImplementation(async (url, options) => {
      if (url.endsWith('/graphql') && JSON.parse(options.body).query.includes('MaterialSettingsProject')) return response(projectResponse);
      if (url.endsWith('/graphql')) return response(JSON.parse(options.body).variables.after ? metadata([{ ...variable, id: 'second' }]) : metadata([variable], { hasNextPage: true, endCursor: 'next' }));
      return response(url.endsWith('page=1') ? Array.from({ length: 100 }, (_, id) => ({ id: id + 1, name: 'Member', access_level: 20 })) : [{ id: 101, name: 'Last', access_level: 10 }]);
    });
    const state = await adapter.load();
    expect(state.variables).toHaveLength(2);
    expect(state.members).toHaveLength(101);
  });

  it('rejects generic integration toggles without changing provider configuration', async () => {
    await expect(adapter.toggleIntegration({ id: 'jenkins', on: false })).rejects.toThrow('integration editor');
    await expect(adapter.bulkToggleIntegrations({ ids: ['jenkins'], on: true })).rejects.toThrow('dedicated editor');
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it.each(['https://elsewhere.invalid/settings', '//elsewhere.invalid/settings', '/\\elsewhere.invalid/settings'])('rejects a non-local mutation destination %s', async (projectEndpoint) => {
    adapter = createProjectSettingsAdapter({ projectId: 7, fullPath: 'group/project', projectEndpoint, permissions: { project: true }, fetchImpl });
    await expect(adapter.updateProject({ name: 'Changed' })).rejects.toThrow('local paths');
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('fails when the GraphQL cursor repeats rather than duplicating variables forever', async () => {
    setup({ variables: true });
    fetchImpl.mockResolvedValueOnce(response(projectResponse)).mockResolvedValue(response(metadata([variable], { hasNextPage: true, endCursor: 'same' })));
    const state = await adapter.load();
    expect(state.variables).toEqual([]);
    expect(state.errors).toContain('variables: Variable metadata pagination did not advance');
    expect(fetchImpl).toHaveBeenCalledTimes(3);
  });
});
