import fs from 'fs';
import path from 'path';
import { createGitLabClient } from '~/material_system/surfaces/gitlabApi';
import { normalizeMergeRequest, fetchMergeRequests } from '~/material_system/surfaces/MergeRequests/data';
import { normalizePipeline } from '~/material_system/surfaces/Pipelines/data';
import { normalizeBranch, normalizeCommit, normalizeTag } from '~/material_system/surfaces/Code/data';

jest.mock('~/lib/utils/axios_utils', () => ({
  get: jest.fn(() => Promise.resolve({ data: [] })),
  post: jest.fn(() => Promise.resolve({ data: {} })),
  put: jest.fn(() => Promise.resolve({ data: {} })),
  delete: jest.fn(() => Promise.resolve({ data: {} })),
}));

const surfaceRoot = path.resolve(__dirname, '../../../app/assets/javascripts/material_system/surfaces');
const read = (file) => fs.readFileSync(path.join(surfaceRoot, file), 'utf8');

describe('collaboration and CI design surfaces', () => {
  it('uses the exact project-path mount contract for every surface', () => {
    expect(read('MergeRequests/index.js')).toMatch(/data-project-path/);
    expect(read('Pipelines/index.js')).toMatch(/data-project-path/);
    expect(read('Code/index.js')).toMatch(/data-project-path/);
    expect(read('Build/index.js')).toMatch(/data-project-path/);
    expect(read('MergeRequests/MergeRequests.vue')).toMatch(/projectPath: \{ type: String, required: true \}/);
    expect(read('Pipelines/Pipelines.vue')).toMatch(/projectPath: \{ type: String, required: true \}/);
    expect(read('Code/Code.vue')).toMatch(/projectPath: \{ type: String, required: true \}/);
    expect(read('Build/Build.vue')).toMatch(/projectPath: \{ type: String, required: true \}/);
  });

  it('fails closed when production data is requested without a project path', async () => {
    await expect(fetchMergeRequests()).rejects.toThrow('project path is required');
    expect(() => createGitLabClient()).toThrow('project path is required');
  });

  it('maps real GitLab response shapes without inventing records', () => {
    expect(normalizeMergeRequest({ id: 7, iid: 3, title: 'Fix', source_branch: 'fix', target_branch: 'main', state: 'opened', author: { name: 'A' }, pipeline: { status: 'success' } })).toMatchObject({ id: 7, iid: 3, state: 'Open', branch: 'fix', target: 'main', pipeline: 'success' });
    expect(normalizePipeline({ id: 9, ref: 'main', sha: 'abc', status: 'running' }, [{ id: 22, name: 'test', stage: 'test', status: 'running' }])).toMatchObject({ id: 9, branch: 'main', status: 'running', stages: [{ name: 'test', jobs: [{ id: 22, status: 'running' }] }] });
    expect(normalizeBranch({ name: 'main', protected: true, commit: { short_id: 'abc', title: 'Initial' } })).toMatchObject({ name: 'main', protected: true, deletable: false });
    expect(normalizeCommit({ id: 'abc123', short_id: 'abc123', title: 'Commit', author_name: 'A' })).toMatchObject({ sha: 'abc123', message: 'Commit', author: 'A' });
    expect(normalizeTag({ name: 'v1', commit: { short_id: 'abc', title: 'Release' } })).toMatchObject({ name: 'v1' });
  });

  it('keeps production surfaces free of seed, mock, and simulated data paths', () => {
    const files = [
      'gitlabApi.js',
      'MergeRequests/data.js', 'MergeRequests/MergeRequests.vue',
      'Pipelines/data.js', 'Pipelines/Pipelines.vue',
      'Code/data.js', 'Code/Code.vue',
      'Build/data.js', 'Build/Build.vue',
    ];
    files.forEach((file) => expect(read(file)).not.toMatch(/\b(seed|mock|simulat(?:e|ed|es|ion))\b/i));
  });
});
