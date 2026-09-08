import fs from 'fs';
import path from 'path';

import {
  fetchMilestones,
  fetchWikiPages,
  createProjectPlanAdapter,
  PlanResourceUnavailableError,
} from '~/material_system/surfaces/Plan/data';
import {
  loadEpics,
} from '~/material_system/surfaces/Epics/data';
import {
  fetchTodos,
} from '~/material_system/surfaces/Todos/data';

const response = (body, status = 200) => ({ ok: status >= 200 && status < 300, status, json: async () => body });

describe('planning design-contract data adapters', () => {
  it('fails closed when a Plan route is not supplied instead of rendering a fixture', async () => {
    await expect(fetchMilestones({ endpoints: {} })).rejects.toThrow('route is not configured');
  });

  it('normalizes server milestone and wiki payloads', async () => {
    const fetcher = jest.fn()
      .mockResolvedValueOnce(response({ data: [{ id: 7, title: 'Release', state: 'active' }] }))
      .mockResolvedValueOnce(response({ items: [{ slug: 'home', title: 'Home', content: 'Real wiki' }] }));
    await expect(fetchMilestones({ endpoint: '/milestones', fetcher })).resolves.toEqual([
      expect.objectContaining({ id: 7, name: 'Release', state: 'active' }),
    ]);
    await expect(fetchWikiPages({ endpoint: '/wiki', fetcher })).resolves.toEqual([
      expect.objectContaining({ id: 'home', title: 'Home', body: 'Real wiki' }),
    ]);
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it('adapts milestones and wiki pages through project REST routes with CSRF and preserved formats', async () => {
    const root = { querySelector: jest.fn().mockReturnValue({ content: 'csrf-value' }) };
    const fetcher = jest.fn()
      .mockResolvedValueOnce(response([{ id: 7, iid: 3, title: 'Release', state: 'active' }]))
      .mockResolvedValueOnce(response([{ slug: 'a/b', title: 'Home', content: 'Real wiki', format: 'rdoc' }]))
      .mockResolvedValueOnce(response({ id: 7, title: 'Release', state: 'closed' }))
      .mockResolvedValueOnce(response({ slug: 'a/b', title: 'Home', content: 'Updated', format: 'rdoc' }))
      .mockResolvedValueOnce(response(null, 204));
    const adapter = createProjectPlanAdapter({ projectId: 123, root, fetcher, permissions: { milestones: true, wiki: true } });

    await expect(adapter.fetchMilestones()).resolves.toEqual([expect.objectContaining({ id: 7, name: 'Release' })]);
    await expect(adapter.fetchWikiPages()).resolves.toEqual([expect.objectContaining({ id: 'a/b', format: 'rdoc' })]);
    await adapter.mutateEntity({ resource: 'milestones', id: 7, changes: { state: 'closed' } });
    await adapter.saveWiki({ id: 'a/b', body: 'Updated' });
    await expect(adapter.deleteEntity({ resource: 'wiki', id: 'a/b' })).resolves.toBe(true);

    expect(fetcher.mock.calls[0][0]).toContain('/api/v4/projects/123/milestones?state=all');
    expect(fetcher.mock.calls[1][0]).toContain('/api/v4/projects/123/wikis?with_content=1');
    expect(fetcher.mock.calls[2][0]).toContain('/milestones/7');
    expect(fetcher.mock.calls[2][1]).toMatchObject({ method: 'PUT', headers: expect.objectContaining({ 'X-CSRF-Token': 'csrf-value' }) });
    expect(JSON.parse(fetcher.mock.calls[2][1].body)).toEqual({ state_event: 'close' });
    expect(fetcher.mock.calls[3][0]).toContain('/wikis/a%2Fb');
    expect(JSON.parse(fetcher.mock.calls[3][1].body)).toEqual({ content: 'Updated', format: 'rdoc' });
    expect(fetcher.mock.calls[4][1]).toMatchObject({ method: 'DELETE' });
  });

  it('reports CE-only resources independently, including an empty DELETE response', async () => {
    const adapter = createProjectPlanAdapter({ projectId: 123, fetcher: jest.fn() });
    await expect(adapter.fetchRequirements()).rejects.toBeInstanceOf(PlanResourceUnavailableError);
    await expect(adapter.deleteEntity({ resource: 'requirements', id: 9 })).rejects.toBeInstanceOf(PlanResourceUnavailableError);
  });

  it('follows milestone pagination without silently dropping later records', async () => {
    const fetcher = jest.fn()
      .mockResolvedValueOnce(response(Array.from({ length: 100 }, (_, id) => ({ id: id + 1, title: `Milestone ${id}`, state: 'active' }))))
      .mockResolvedValueOnce(response([{ id: 101, title: 'Last milestone', state: 'closed' }]));
    const adapter = createProjectPlanAdapter({ projectId: 123, fetcher });
    await expect(adapter.fetchMilestones()).resolves.toHaveLength(101);
    expect(fetcher.mock.calls[1][0]).toContain('per_page=100&page=2');
  });

  it('normalizes real numeric iteration states and automatically scheduled titles', async () => {
    const fetcher = jest.fn().mockResolvedValue(response([{ id: 10, sequence: 4, title: null, state: 2, web_url: '/groups/team/-/iterations/10' }]));
    const adapter = createProjectPlanAdapter({ projectId: 123, fetcher });
    await expect(adapter.fetchIterations()).resolves.toMatchObject([{ id: 10, name: 'Iteration 4', state: 'active' }]);
  });

  it('reports forbidden iterations independently from accessible milestones', async () => {
    const fetcher = jest.fn().mockResolvedValueOnce(response({}, 403)).mockResolvedValueOnce(response([{ id: 1, title: 'Accessible' }]));
    const adapter = createProjectPlanAdapter({ projectId: 123, fetcher });
    await expect(adapter.fetchIterations()).rejects.toMatchObject({ status: 403, resource: 'iterations' });
    await expect(adapter.fetchMilestones()).resolves.toHaveLength(1);
  });

  it('rejects malformed successful lists instead of treating them as empty', async () => {
    const adapter = createProjectPlanAdapter({ projectId: 123, fetcher: jest.fn().mockResolvedValue(response({ message: 'invalid list' })) });
    await expect(adapter.fetchMilestones()).rejects.toThrow('Invalid milestones response');
  });

  it('rejects a wiki save without a matching server page', async () => {
    const fetcher = jest.fn().mockResolvedValueOnce(response([{ slug: 'home', content: 'Existing', format: 'markdown' }])).mockResolvedValueOnce(response(null));
    const adapter = createProjectPlanAdapter({ projectId: 123, fetcher, permissions: { wiki: true } });
    await adapter.fetchWikiPages();
    await expect(adapter.saveWiki({ id: 'home', body: 'Changed' })).rejects.toThrow('did not return the saved wiki page');
  });

  it('rejects unauthorized mutation capabilities before transport', async () => {
    const fetcher = jest.fn();
    const adapter = createProjectPlanAdapter({ projectId: 123, fetcher, permissions: { milestones: false, wiki: false } });
    await expect(adapter.mutateEntity({ resource: 'milestones', id: 1, changes: { state: 'closed' } })).rejects.toThrow('current project access');
    await expect(adapter.saveWiki({ id: 'home', body: 'Changed' })).rejects.toThrow('current project access');
    await expect(adapter.deleteEntity({ resource: 'wiki', id: 'home' })).rejects.toThrow('current project access');
    expect(fetcher).not.toHaveBeenCalled();
  });

  it.each([undefined, null, false, 0, 1, 'true', 'false', {}, []])('requires exact true for every write instead of accepting permission %p', async (permission) => {
    const fetcher = jest.fn();
    const adapter = createProjectPlanAdapter({ projectId: 123, fetcher, permissions: { milestones: permission, wiki: permission } });
    await expect(adapter.mutateEntity({ resource: 'milestones', id: 1, changes: { state: 'closed' } })).rejects.toThrow('current project access');
    await expect(adapter.saveWiki({ id: 'home', body: 'Changed' })).rejects.toThrow('current project access');
    await expect(adapter.deleteEntity({ resource: 'wiki', id: 'home' })).rejects.toThrow('current project access');
    expect(fetcher).not.toHaveBeenCalled();
  });

  it.each([undefined, null, false, 'true'])('rejects writes when the permission object itself is absent or malformed: %p', async (permissions) => {
    const fetcher = jest.fn();
    const adapter = createProjectPlanAdapter({ projectId: 123, fetcher, permissions });
    await expect(adapter.mutateEntity({ resource: 'milestones', id: 1, changes: { state: 'active' } })).rejects.toThrow('current project access');
    await expect(adapter.saveWiki({ id: 'home', body: 'Changed' })).rejects.toThrow('current project access');
    await expect(adapter.deleteEntity({ resource: 'wiki', id: 'home' })).rejects.toThrow('current project access');
    expect(fetcher).not.toHaveBeenCalled();
  });

  it('follows every GraphQL epic page and never falls back to an inline list', async () => {
    const fetcher = jest.fn()
      .mockResolvedValueOnce(response({ data: { group: { epics: { nodes: [{ id: 'e1', iid: 1, title: 'One', state: 'opened' },], pageInfo: { hasNextPage: true, endCursor: 'cursor-1' } } } } }))
      .mockResolvedValueOnce(response({ data: { group: { epics: { nodes: [{ id: 'e2', iid: 2, title: 'Two', state: 'opened' }], pageInfo: { hasNextPage: false, endCursor: null } } } } }));
    await expect(loadEpics({ fullPath: 'group/project', fetcher })).resolves.toEqual([
      expect.objectContaining({ id: 'e1', reference: '&1' }),
      expect.objectContaining({ id: 'e2', reference: '&2' }),
    ]);
    expect(JSON.parse(fetcher.mock.calls[1][1].body).variables.after).toBe('cursor-1');
  });

  it('maps real Todo GraphQL entities and reports server errors', async () => {
    const fetcher = jest.fn().mockResolvedValue(response({ data: { currentUser: { todos: {
      nodes: [{ id: 't1', state: 'pending', action: 'assigned', createdAt: '2026-08-19T10:00:00Z', targetUrl: '/issues/1', author: { name: 'Ada' }, project: { nameWithNamespace: 'group/project' }, targetEntity: { reference: '#1', webPath: '/group/project/-/issues/1' } }],
      pageInfo: { hasNextPage: false },
    } } } }));
    await expect(fetchTodos({ fetcher })).resolves.toMatchObject({
      todos: [expect.objectContaining({
        id: 't1',
        actor: 'Ada',
        target: expect.objectContaining({ label: '#1' }),
      })],
    });
    fetcher.mockResolvedValueOnce(response({}, 403));
    await expect(fetchTodos({ fetcher })).rejects.toThrow('request failed (403)');
  });

  it('keeps the exact surface mount entrypoints and design contract references', () => {
    const root = path.resolve(__dirname, '../../..');
    const planEntry = fs.readFileSync(path.join(root, 'app/assets/javascripts/material_system/surfaces/Plan/index.js'), 'utf8');
    const epicsEntry = fs.readFileSync(path.join(root, 'app/assets/javascripts/material_system/surfaces/Epics/index.js'), 'utf8');
    const todosEntry = fs.readFileSync(path.join(root, 'app/assets/javascripts/material_system/surfaces/Todos/index.js'), 'utf8');
    expect(planEntry).toContain('mountPlan');
    expect(planEntry).toContain('createProjectPlanProps');
    expect(epicsEntry).toContain('mountEpics');
    expect(todosEntry).toContain('initTodosSurface');
    expect(fs.existsSync(path.join(root, 'design/Plan.dc.html'))).toBe(true);
    expect(fs.existsSync(path.join(root, 'design/Epics.dc.html'))).toBe(true);
    expect(fs.existsSync(path.join(root, 'design/Todos.dc.html'))).toBe(true);
  });

  it('rejects a production fallback when the exact seed symbol is removed or renamed', () => {
    const root = path.resolve(__dirname, '../../..');
    const sources = [
      'app/assets/javascripts/material_system/surfaces/Plan/data.js',
      'app/assets/javascripts/material_system/surfaces/Epics/data.js',
      'app/assets/javascripts/material_system/surfaces/Todos/data.js',
    ].map((file) => fs.readFileSync(path.join(root, file), 'utf8'));
    sources.forEach((source) => {
      expect(source).not.toMatch(/\b(?:createSeedTodos|MOCK_EPICS|DEFAULT_MILESTONES|DEFAULT_ITERATIONS|DEFAULT_REQUIREMENTS|DEFAULT_WIKI_PAGES)\b/);
    });
  });
});
