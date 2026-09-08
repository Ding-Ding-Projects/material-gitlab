import { buildEpicTree, deleteEpic, formatMonthRange, loadEpics, mutateEpic } from '~/material_system/surfaces/Epics/data';

const response = (body, status = 200) => ({ ok: status >= 200 && status < 300, status, json: jest.fn().mockResolvedValue(body) });
const connectionResponse = (nodes, pageInfo = { hasNextPage: false, endCursor: null }) => response({
  data: { group: { epics: { nodes, pageInfo } } },
});
const config = {
  fullPath: 'planning/platform',
  graphqlEndpoint: '/api/graphql',
  updateEndpoint: '/planning/platform/-/epics',
  deleteEndpoint: '/planning/platform/-/epics',
  permissions: { update: false, delete: false },
};

describe('group Epics route adapter', () => {
  it('loads the real group GraphQL connection with a server-supplied group identity', async () => {
    const fetcher = jest.fn().mockResolvedValue(response({
      data: { group: { epics: { nodes: [{ id: 'gid://gitlab/Epic/12', iid: '12', title: 'Plan', state: 'opened', startDate: null, dueDate: null, webUrl: '/planning/platform/-/epics/12', descendantCounts: { closedIssues: 1, openedIssues: 2 }, group: { id: 'gid://gitlab/Group/1', fullPath: 'planning/platform', fullName: 'Planning' } }], pageInfo: { hasNextPage: false, endCursor: null } } } },
    }));

    await expect(loadEpics({ ...config, fetcher })).resolves.toEqual([expect.objectContaining({ id: 'gid://gitlab/Epic/12', routeIid: '12', webUrl: '/planning/platform/-/epics/12' })]);
    const [url, request] = fetcher.mock.calls[0];
    expect(url).toBe('/api/graphql');
    expect(request).toEqual(expect.objectContaining({ method: 'POST', credentials: 'same-origin', redirect: 'error' }));
    expect(JSON.parse(request.body)).toEqual(expect.objectContaining({ variables: { fullPath: 'planning/platform', after: null } }));
  });

  it('rejects write operations unless the server has supplied the exact true permission', async () => {
    const fetcher = jest.fn();
    await expect(mutateEpic({ id: '12', changes: { state: 'closed' }, options: { ...config, fetcher } })).rejects.toThrow('current group access');
    await expect(deleteEpic({ id: '12', options: { ...config, fetcher } })).rejects.toThrow('current group access');
    expect(fetcher).not.toHaveBeenCalled();
  });

  it('uses same-origin CSRF-protected REST routes only when each server permission is explicitly true', async () => {
    const existing = document.querySelector('meta[name="csrf-token"]');
    const meta = existing || document.createElement('meta');
    const previousContent = meta.content;
    meta.name = 'csrf-token';
    meta.content = 'epics-csrf';
    document.head.appendChild(meta);
    const fetcher = jest.fn().mockResolvedValue(response({}));
    try {
      await mutateEpic({ id: '12', changes: { state: 'closed' }, options: { ...config, permissions: { update: true }, fetcher } });
      expect(fetcher).toHaveBeenCalledWith('/planning/platform/-/epics/12', expect.objectContaining({ method: 'PATCH', credentials: 'same-origin', redirect: 'error', headers: expect.objectContaining({ 'X-CSRF-Token': 'epics-csrf' }) }));
    } finally { if (existing) meta.content = previousContent; else meta.remove(); }
  });

  it('does not follow a repeated GraphQL cursor', async () => {
    const fetcher = jest.fn().mockResolvedValue(response({ data: { group: { epics: { nodes: [], pageInfo: { hasNextPage: true, endCursor: 'same' } } } } }));
    await expect(loadEpics({ ...config, fetcher })).rejects.toThrow('pagination did not advance');
  });

  it('rejects a missing group or Epics connection instead of rendering a fake empty list', async () => {
    const fetcher = jest.fn().mockResolvedValue(response({ data: { group: null } }));
    await expect(loadEpics({ ...config, fetcher })).rejects.toThrow('unavailable or invalid');
  });

  it('retains unique GraphQL identities when descendant groups share an Epic IID', async () => {
    const epic = (id, fullPath) => ({ id, iid: '12', title: fullPath, state: 'opened', startDate: null, dueDate: null, webUrl: `/${fullPath}/-/epics/12`, descendantCounts: { closedIssues: 0, openedIssues: 0 }, group: { id: `gid://gitlab/Group/${fullPath}`, fullPath, fullName: fullPath } });
    const fetcher = jest.fn().mockResolvedValue(connectionResponse([
      epic('gid://gitlab/Epic/12', 'planning'),
      epic('gid://gitlab/Epic/99', 'planning/subgroup'),
    ]));
    await expect(loadEpics({ ...config, fetcher })).resolves.toEqual(expect.arrayContaining([
      expect.objectContaining({ id: 'gid://gitlab/Epic/12', routeIid: '12' }),
      expect.objectContaining({ id: 'gid://gitlab/Epic/99', routeIid: '12' }),
    ]));
  });

  it('assembles parent-child relationships from global identities without duplicating child rows', () => {
    expect(buildEpicTree([{ id: 'child', parent: { id: 'parent' } }, { id: 'parent' }])).toEqual([
      { id: 'parent', children: [{ id: 'child', parent: { id: 'parent' }, children: [] }] },
    ]);
    expect(() => buildEpicTree([{ id: 'one', parent: { id: 'two' } }, { id: 'two', parent: { id: 'one' } }])).toThrow('cyclic hierarchy');
  });

  it('displays actual schedule dates instead of projecting them onto a reference year', () => {
    expect(formatMonthRange('2027-09-10', '2028-01-01')).toBe('2027-09-10 → 2028-01-01');
    expect(formatMonthRange(null, '2028-01-01')).toBe('');
  });

  it('rejects missing pagination metadata instead of silently stopping at one page', async () => {
    const fetcher = jest.fn().mockResolvedValue(connectionResponse([], {}));
    await expect(loadEpics({ ...config, fetcher })).rejects.toThrow('unavailable or invalid');
  });
});
