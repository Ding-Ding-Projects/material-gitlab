import fs from 'fs';
import path from 'path';
import {
  REPOSITORY_ADAPTER_METHODS,
  assertRepositoryAdapter,
  createRepositoryAdapter,
  normalizeRepositoryData,
} from '~/material_system/surfaces/Repository/data';

const validData = {
  project: { name: 'real-project', visibility: 'private', cloneUrls: { https: 'https://gitlab.example/project.git' } },
  branches: ['main'],
  defaultBranch: 'main',
  tree: { '': [{ name: 'README.md', kind: 'file', path: 'README.md' }] },
  blobs: { 'README.md': { name: 'README.md', rawText: '# real' } },
  commits: [{ sha: '0123456789abcdef', message: 'Real commit', author: 'A User' }],
};

describe('Material Repository adapter boundary', () => {
  it('requires every read and mutation method', () => {
    expect(() => assertRepositoryAdapter({ load: jest.fn() })).toThrow('loadBlob');
    expect(REPOSITORY_ADAPTER_METHODS).toEqual([
      'load', 'loadBlob', 'branches', 'toggleStar', 'fork', 'download', 'deleteEntries',
    ]);
  });

  it('normalizes server data and never invents missing metadata', () => {
    const normalized = normalizeRepositoryData(validData);
    expect(normalized.project.name).toBe('real-project');
    expect(normalized.tree[''][0].path).toBe('README.md');
    expect(normalized.blobs['README.md'].lines).toEqual(['# real']);
    expect(() => normalizeRepositoryData({ ...validData, branches: [] })).toThrow('no branches');
    expect(() => normalizeRepositoryData({ ...validData, project: null })).toThrow('no project metadata');
  });

  it('uses authoritative adapter results for load and mutations', async () => {
    const calls = [];
    const adapter = createRepositoryAdapter({
      load: jest.fn(async (context) => { calls.push(['load', context]); return validData; }),
      loadBlob: jest.fn(async () => validData.blobs['README.md']),
      branches: jest.fn(async () => ['main']),
      toggleStar: jest.fn(async () => ({ project: { starred: true, stars: 1 } })),
      fork: jest.fn(async () => ({ project: { forks: 2 } })),
      download: jest.fn(async (payload) => ({ accepted: true, payload })),
      deleteEntries: jest.fn(async (payload) => ({ accepted: true, payload })),
    });

    await expect(adapter.load({ branch: 'main', path: '' })).resolves.toMatchObject({ project: { name: 'real-project' } });
    await adapter.toggleStar({ branch: 'main' });
    await adapter.deleteEntries({ paths: ['README.md'] });
    expect(calls).toEqual([['load', { branch: 'main', path: '' }]]);
  });

  it('fails the production source guard when sample data or fake mutation paths return', () => {
    const file = path.resolve(__dirname, '../../../app/assets/javascripts/material_system/surfaces/Repository/Repository.vue');
    const source = fs.readFileSync(file, 'utf8');
    expect(source).not.toMatch(/createSampleRepositoryData|demo dataset|new Blob\(/);
    expect(source).toMatch(/assertRepositoryAdapter\(this\.adapter\)/);
    expect(source).toMatch(/this\.adapter\.deleteEntries/);
    expect(source).toMatch(/this\.adapter\.download/);
  });
});
