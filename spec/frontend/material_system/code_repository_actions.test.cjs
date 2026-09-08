const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const babel = require('@babel/core');
const vueCompiler = require('vue-template-compiler');
const root = path.resolve(__dirname, '../../..');
const base = path.join(root, 'app/assets/javascripts/material_system/surfaces');
const notifications = [];
const notificationCenter = { notify: (value) => notifications.push(value) };
function load(name, isVue = false) {
  const filename = path.join(base, name);
  const source = fs.readFileSync(filename, 'utf8');
  const script = isVue ? vueCompiler.parseComponent(source).script.content : source;
  const { code } = babel.transformSync(script, { filename, babelrc: false, configFile: false, plugins: [require.resolve('@babel/plugin-transform-modules-commonjs')] });
  const module = { exports: {} };
  const localRequire = (specifier) => {
    if (specifier === '~/lib/utils/axios_utils') return {};
    if (specifier.endsWith('/notifications')) return { __esModule: true, default: notificationCenter, notificationCenter };
    if (specifier.endsWith('/settings')) return {};
    if (specifier.endsWith('.vue')) return {};
    if (specifier.startsWith('.')) return load(path.relative(base, path.resolve(path.dirname(filename), specifier + '.js')));
    return require(specifier);
  };
  new Function('require', 'module', 'exports', code)(localRequire, module, module.exports);
  return module.exports;
}
const codeData = load('Code/data.js');
const repositoryData = load('Repository/data.js');
const Code = load('Code/Code.vue', true).default;
const Repository = load('Repository/Repository.vue', true).default;
const project = { name: 'Project', default_branch: 'main', visibility: 'private', star_count: 2, forks_count: 1, http_url_to_repo: 'https://gitlab.example/g/p.git' };
function repositoryClient(overrides = {}) {
  return { get: async (url, options) => {
    if (overrides.get) { const value = await overrides.get(url, options); if (value) return value; }
    if (url.endsWith('/repository/branches')) return { data: [{ name: 'main' }, { name: 'feature/slash' }] };
    if (url.endsWith('/repository/tree')) return { data: [{ name: 'README.md', path: 'src/README.md', type: 'blob' }] };
    if (url.endsWith('/repository/commits') || url.endsWith('/repository/tags')) return { data: [] };
    if (url.endsWith('/languages')) return { data: { Ruby: 70, JavaScript: 30 } };
    return { data: project };
  }, post: async () => ({ data: { star_count: 3 } }) };
}

test('Code deletion waits for the server and preserves protected/default branches', async () => {
  const calls = [];
  const client = codeData.createCodeClient('group/project', {
    get: async (url) => ({ data: { name: url.split('/').pop(), protected: url.endsWith('protected'), default: url.endsWith('main') } }),
    delete: async (url) => { calls.push(url); return { status: 204 }; },
  });
  await assert.rejects(client.deleteBranch('protected'), /Protected/);
  await assert.rejects(client.deleteBranch('main'), /default/);
  await client.deleteBranch('feature/slash');
  assert.deepEqual(calls, ['/api/v4/projects/group%2Fproject/repository/branches/feature%2Fslash']);
});

test('Code tag and snippet deletion require an actual successful HTTP response', async () => {
  const calls = [];
  const client = codeData.createCodeClient('g/p', { get: async () => ({ data: { protected: false } }), delete: async (url) => { calls.push(url); return { status: 204 }; } });
  await client.deleteTag('release/v1'); await client.deleteSnippet(7);
  assert.deepEqual(calls, ['/api/v4/projects/g%2Fp/repository/tags/release%2Fv1', '/api/v4/projects/g%2Fp/snippets/7']);
  const interrupted = codeData.createCodeClient('g/p', { delete: async () => undefined });
  await assert.rejects(interrupted.deleteSnippet(7), /did not confirm/);
});

test('Code partial bulk deletion removes only successful rows and retains failed selection', async () => {
  notifications.length = 0;
  let release;
  const pending = new Promise((resolve) => { release = resolve; });
  const vm = { permissions: { Branches: true }, mutationPending: false, entities: { branches: [{ id: 'good' }, { id: 'bad' }, { id: 'protected', protected: true }] }, selectedByTab: { Branches: ['good', 'bad', 'protected'] }, removeFromSelection(tab, id) { this.selectedByTab[tab] = this.selectedByTab[tab].filter((value) => value !== id); } };
  const resultPromise = Code.methods.deleteEntities.call(vm, 'Branches', 'branches', ['good', 'bad', 'protected'], async (entity) => { if (entity.id === 'good') return pending; throw new Error('Permission changed'); });
  assert.equal(vm.entities.branches.length, 3); assert.equal(notifications.length, 0);
  release();
  const result = await resultPromise;
  assert.deepEqual(result.deleted, ['good']); assert.deepEqual(result.skipped, ['protected']);
  assert.deepEqual(vm.entities.branches.map((item) => item.id), ['bad', 'protected']);
  assert.deepEqual(vm.selectedByTab.Branches, ['bad', 'protected']);
  assert.equal(vm.mutationPending, false); assert.match(notifications.find((item) => item.severity === 'error').message, /Permission changed/);
});

test('Code commit statuses remain unknown when the API supplies no pipeline result', () => {
  assert.equal(codeData.normalizeCommit({ id: 'a', title: 'Change' }).pipelineStatus, null);
  assert.equal(codeData.normalizeBranch({ name: 'main', default: true }).deletable, false);
  assert.equal(codeData.normalizeTag({ name: 'v1', protected: true }).deletable, false);
});

test('Code list traversal reaches later pages instead of counting just the first page', async () => {
  const pages = [];
  const client = codeData.createCodeClient('g/p', { get: async (_url, options) => { pages.push(options.params.page); return { data: [{ name: 'page-' + options.params.page }], headers: { 'x-next-page': options.params.page === 1 ? '2' : '' } }; } });
  assert.equal((await client.listBranches()).length, 2); assert.deepEqual(pages, [1, 2]);
});

test('Repository parent tree and explicitly cleared root path preserve slash-containing refs', async () => {
  const calls = [];
  const adapter = repositoryData.createProjectRepositoryAdapter({ projectPath: 'g/p', ref: 'feature/slash', path: 'src', client: repositoryClient({ get: async (url, options) => { if (url.endsWith('/repository/tree')) calls.push(options.params); } }) });
  await adapter.load(); await adapter.load({ path: '' });
  assert.equal(calls[0].path, 'src'); assert.equal(calls[0].ref, 'feature/slash'); assert.equal(calls[1].path, undefined);
});

test('Repository initial blob loads its parent directory then activates the full file path', async () => {
  const requests = [];
  const vm = { adapter: { load: async (args) => { requests.push(['tree', args]); return { project: { name: 'P' }, branches: ['main'], defaultBranch: 'main', tree: { src: [] } }; }, loadBlob: async (args) => { requests.push(['blob', args]); return { name: 'README.md', path: 'src/README.md', rawText: 'text', lines: ['text'] }; } }, currentBranch: 'feature/slash', pathKey: 'src', initialPath: 'src/README.md', initialBlobPending: true, $set: (object, key, value) => { object[key] = value; } };
  await Repository.methods.loadRepository.call(vm);
  assert.deepEqual(requests[0], ['tree', { branch: 'feature/slash', path: 'src' }]);
  assert.deepEqual(requests[1], ['blob', { path: 'src/README.md', branch: 'feature/slash' }]);
  assert.equal(vm.blobName, 'src/README.md'); assert.equal(vm.repository.blobs['src/README.md'].rawText, 'text');
});

test('Repository counts use complete refs and authoritative optional statistics', async () => {
  const adapter = repositoryData.createProjectRepositoryAdapter({ projectPath: 'g/p', client: repositoryClient({ get: async (url, options) => {
    if (url.endsWith('/repository/branches')) return { data: [{ name: 'page-' + options.params.page }], headers: { 'x-next-page': options.params.page === 1 ? '2' : '' } };
  } }) });
  const value = await adapter.load();
  assert.equal(value.project.branchCount, 2); assert.equal(value.project.commitCount, null); assert.equal(value.project.storage, ''); assert.equal(value.languages[0].percent, 70);
});

test('Repository empty state comes from the project response and never from a 404', async () => {
  let requests = 0;
  const adapter = repositoryData.createProjectRepositoryAdapter({ projectPath: 'g/p', client: { get: async () => { requests += 1; return { data: { ...project, default_branch: null, empty_repo: true } }; } } });
  const value = await adapter.load(); assert.equal(value.emptyRepository, true); assert.deepEqual(value.branches, []); assert.equal(requests, 1);
  const missing = repositoryData.createProjectRepositoryAdapter({ projectPath: 'g/p', client: { get: async () => { throw new Error('404'); } } });
  await assert.rejects(missing.load(), /404/);
});

test('Repository decodes UTF-8 exactly and marks binary or unsupported encodings explicitly', () => {
  assert.deepEqual(repositoryData.decodeRepositoryContent({ encoding: 'base64', content: Buffer.from('caf\u00e9 \u9999\u6e2f').toString('base64') }), { binary: false, rawText: 'caf\u00e9 \u9999\u6e2f' });
  assert.equal(repositoryData.decodeRepositoryContent({ encoding: 'base64', content: '/wAB' }).binary, true);
  assert.equal(repositoryData.decodeRepositoryContent({ encoding: 'unknown', content: 'text' }).binary, true);
  assert.equal(repositoryData.decodeRepositoryContent({ encoding: 'base64', content: '' }).rawText, '');
});

test('Selected downloads target exactly one file or directory and reject zero/multiple selections', async () => {
  const urls = [];
  const adapter = repositoryData.createProjectRepositoryAdapter({ projectPath: 'g/p', ref: 'feature/slash', client: repositoryClient(), navigate: (url) => urls.push(url) });
  await adapter.download({ entries: [{ path: 'src/file.txt', kind: 'file' }] });
  await adapter.download({ entries: [{ path: 'src', kind: 'dir' }] });
  assert.equal(urls[0], '/api/v4/projects/g%2Fp/repository/files/src%2Ffile.txt/raw?ref=feature%2Fslash');
  assert.equal(urls[1], '/api/v4/projects/g%2Fp/repository/archive?sha=feature%2Fslash&path=src');
  await assert.rejects(adapter.download({ entries: [] }), /exactly one/);
  await assert.rejects(adapter.download({ entries: [{ path: 'a' }, { path: 'b' }] }), /exactly one/);
  assert.equal(urls.length, 2); assert.equal(adapter.capabilities.deleteEntries, false);
});

test('Star toggles use the authenticated initial state and actual successful responses', async () => {
  const calls = [];
  const client = repositoryClient(); client.post = async (url) => { calls.push(url); return { data: { star_count: calls.length === 1 ? 1 : 2 } }; };
  const adapter = repositoryData.createProjectRepositoryAdapter({ projectPath: 'g/p', initialStarred: true, client });
  assert.equal((await adapter.toggleStar()).project.starred, false);
  assert.equal((await adapter.toggleStar()).project.starred, true);
  assert.deepEqual(calls, ['/api/v4/projects/g%2Fp/unstar', '/api/v4/projects/g%2Fp/star']);
});

test('Every Code and Repository component template/script compiles', () => {
  for (const name of ['Code', 'Repository']) for (const relative of fs.readdirSync(path.join(base, name), { recursive: true }).filter((value) => value.endsWith('.vue'))) {
    const filename = path.join(base, name, relative);
    const descriptor = vueCompiler.parseComponent(fs.readFileSync(filename, 'utf8'));
    assert.deepEqual(vueCompiler.compile(descriptor.template.content).errors, [], filename);
    babel.transformSync(descriptor.script.content, { filename, babelrc: false, configFile: false, plugins: [require.resolve('@babel/plugin-transform-modules-commonjs')] });
  }
});
