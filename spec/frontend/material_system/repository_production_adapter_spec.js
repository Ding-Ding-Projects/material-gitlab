jest.mock('~/lib/utils/axios_utils', () => ({ get: jest.fn(), post: jest.fn() }));

import { createProjectRepositoryAdapter } from '~/material_system/surfaces/Repository/data';

describe('project REST repository adapter', () => {
  const project = {
    name: 'Project',
    default_branch: 'main',
    visibility: 'private',
    star_count: 2,
    starred: false,
    forks_count: 3,
    repository_storage: 'default',
    http_url_to_repo: 'https://example.test/group/project.git',
    ssh_url_to_repo: 'git@example.test:group/project.git',
  };

  it('uses the server-provided ref and path with same-origin REST responses', async () => {
    const get = jest.fn((url) => {
      if (url.endsWith('/repository/branches')) return Promise.resolve({ data: [{ name: 'main' }, { name: 'feature/foo' }] });
      if (url.endsWith('/repository/tree')) return Promise.resolve({ data: [{ name: 'index.js', type: 'blob', path: 'src/index.js' }] });
      if (url.endsWith('/repository/commits')) return Promise.resolve({ data: [{ short_id: 'abc', title: 'Initial', author_name: 'A' }] });
      if (url.endsWith('/repository/tags')) return Promise.resolve({ data: [] });
      return Promise.resolve({ data: project });
    });
    const adapter = createProjectRepositoryAdapter({ projectPath: 'group/project', ref: 'feature/foo', path: 'src', client: { get, post: jest.fn() } });

    const repository = await adapter.load();

    expect(get).toHaveBeenCalledWith('/api/v4/projects/group%2Fproject/repository/tree', {
      params: { ref: 'feature/foo', path: 'src', per_page: 100 },
    });
    expect(repository.branches).toEqual(['main', 'feature/foo']);
    expect(repository.tree.src).toEqual([expect.objectContaining({ name: 'index.js', path: 'src/index.js' })]);
  });

  it('surfaces an API blob error instead of fabricating file content', async () => {
    const error = new Error('Not found');
    const adapter = createProjectRepositoryAdapter({
      projectPath: 'group/project',
      ref: 'main',
      client: { get: jest.fn().mockRejectedValue(error), post: jest.fn() },
    });

    await expect(adapter.loadBlob({ path: 'missing.js' })).rejects.toBe(error);
  });

  it('starts a real archive navigation for downloads', async () => {
    const navigate = jest.fn();
    const adapter = createProjectRepositoryAdapter({ projectPath: 'group/project', ref: 'feature/foo', client: { get: jest.fn(), post: jest.fn() }, navigate });

    await adapter.download({});

    expect(navigate).toHaveBeenCalledWith('/api/v4/projects/group%2Fproject/repository/archive?sha=feature%2Ffoo');
  });
});
