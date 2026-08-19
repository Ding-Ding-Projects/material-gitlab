import fs from 'fs';
import path from 'path';

import {
  fetchMilestones,
  fetchWikiPages,
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

  it('follows every GraphQL epic page and never falls back to an inline list', async () => {
    const fetcher = jest.fn()
      .mockResolvedValueOnce(response({ data: { group: { epics: { nodes: [{ id: 'e1', iid: 1, title: 'One' },], pageInfo: { hasNextPage: true, endCursor: 'cursor-1' } } } } }))
      .mockResolvedValueOnce(response({ data: { group: { epics: { nodes: [{ id: 'e2', iid: 2, title: 'Two' }], pageInfo: { hasNextPage: false, endCursor: null } } } } }));
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
