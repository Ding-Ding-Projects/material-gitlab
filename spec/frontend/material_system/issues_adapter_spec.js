import fs from 'fs';
import path from 'path';

import {
  createGitLabIssuesAdapter,
  createIssuesApi,
  normalizeIssue,
} from '~/material_system/surfaces/Issues/data';

const response = (data, headers = {}) => ({ data, headers });

describe('Material Issues production adapter', () => {
  const issue = {
    id: 9001,
    iid: 42,
    title: 'Real issue',
    description: 'Loaded from GitLab',
    state: 'opened',
    labels: [{ name: 'frontend' }],
    assignees: [{ id: 7, username: 'ada', name: 'Ada Lovelace' }],
    created_at: '2026-08-19T12:00:00Z',
  };

  it('normalizes REST issue fields without inventing seeded values', () => {
    expect(normalizeIssue(issue)).toMatchObject({
      id: 9001,
      iid: 42,
      title: 'Real issue',
      body: 'Loaded from GitLab',
      state: 'Open',
      labels: ['frontend'],
      assignee: 'Ada Lovelace',
      assigneeId: 7,
      assignees: [{ id: 7, name: 'Ada Lovelace' }],
    });
  });

  it('lists a real project with server pagination and state/scope filters', async () => {
    const http = { get: jest.fn().mockResolvedValue(response([issue], { 'x-page': '2', 'x-total-pages': '4', 'x-total': '61' })) };
    const adapter = createGitLabIssuesAdapter({ projectId: 123, http });

    const result = await adapter.listPage({ page: 2, perPage: 20, state: 'opened', scope: 'assigned_to_me' });

    expect(http.get).toHaveBeenCalledWith('/api/v4/projects/123/issues', {
      params: { page: 2, per_page: 20, state: 'opened', scope: 'assigned_to_me' },
    });
    expect(result.pagination).toEqual({ page: 2, perPage: 20, total: 61, totalPages: 4 });
    expect(result.issues[0]).toMatchObject({ iid: 42, state: 'Open' });
  });

  it('creates, updates labels/assignees, moves, and deletes through the REST endpoints', async () => {
    const http = {
      get: jest.fn().mockResolvedValue(response([issue])),
      post: jest.fn().mockResolvedValue(response({ ...issue, id: 9002, iid: 43 })),
      put: jest.fn().mockResolvedValue(response({ ...issue, labels: ['bug'], state: 'closed' })),
      delete: jest.fn().mockResolvedValue(response(null)),
    };
    const adapter = createGitLabIssuesAdapter({ projectId: 123, http });
    await adapter.list();
    await adapter.create({ title: 'New issue', body: 'Description', labels: ['bug'], assigneeId: 7 });
    await adapter.update(9001, { labels: ['frontend', 'bug'], assigneeId: 7, state: 'Closed' });
    await adapter.moveToBoardList(42, 'done');
    await adapter.remove([9001]);

    expect(http.post).toHaveBeenCalledWith('/api/v4/projects/123/issues', expect.objectContaining({
      title: 'New issue', description: 'Description', labels: 'bug', assignee_ids: [7],
    }));
    expect(http.put).toHaveBeenCalledWith('/api/v4/projects/123/issues/42', expect.objectContaining({
      labels: 'frontend,bug', assignee_ids: [7], state_event: 'close',
    }));
    expect(http.delete).toHaveBeenCalledWith('/api/v4/projects/123/issues/42');
  });

  it('fails closed instead of pretending a board move has succeeded without a list id', async () => {
    const adapter = createGitLabIssuesAdapter({ projectId: 123, http: {} });
    await expect(adapter.moveToBoardList(42, 'in-progress')).rejects.toThrow('real board-list id');
  });

  it('requires a real adapter or project id; there is no production memory fallback', () => {
    expect(() => createIssuesApi({ projectId: null })).toThrow('real project adapter');
    expect(createIssuesApi({ adapter: { list: jest.fn() } })).toMatchObject({ list: expect.any(Function) });
  });

  it('keeps the production source free of seed/mock defaults', () => {
    const source = fs.readFileSync(
      path.join(__dirname, '../../../app/assets/javascripts/material_system/surfaces/Issues/data.js'),
      'utf8',
    );
    expect(source).not.toMatch(/seedIssues\s*\(/);
    expect(source).not.toMatch(/Math\.random/);
    expect(source).toMatch(/createGitLabIssuesAdapter/);
  });
});
