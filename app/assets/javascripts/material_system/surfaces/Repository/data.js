import axios from '~/lib/utils/axios_utils';

/**
 * Repository data boundary.
 *
 * The Material surface deliberately has no built-in repository fixture. A
 * host must register an adapter backed by GitLab's GraphQL or Rails APIs.
 */

export const REPOSITORY_ADAPTER_METHODS = Object.freeze([
  'load', 'loadBlob', 'branches', 'toggleStar', 'fork', 'download', 'deleteEntries',
]);

const object = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);
const requiredString = (value, label) => {
  if (typeof value !== 'string' || !value.trim()) throw new Error(`Repository adapter returned an invalid ${label}`);
  return value;
};

const normalizeEntry = (entry) => {
  if (!object(entry)) throw new Error('Repository adapter returned an invalid tree entry');
  return {
    name: requiredString(entry.name, 'tree entry name'),
    kind: entry.kind === 'dir' ? 'dir' : 'file',
    message: typeof entry.message === 'string' ? entry.message : '',
    when: typeof entry.when === 'string' ? entry.when : '',
    path: typeof entry.path === 'string' ? entry.path : entry.name,
  };
};

const normalizeBlob = (blob, fallbackName = '') => {
  if (!object(blob)) throw new Error('Repository adapter returned an invalid blob');
  const lines = Array.isArray(blob.lines)
    ? blob.lines.map((line) => String(line))
    : typeof blob.rawText === 'string' ? blob.rawText.split(/\r\n|\n|\r/) : [];
  return {
    name: requiredString(blob.name || fallbackName, 'blob name'),
    size: typeof blob.size === 'string' ? blob.size : `${blob.bytes || 0} bytes`,
    lines,
    path: typeof blob.path === 'string' ? blob.path : fallbackName,
    rawText: typeof blob.rawText === 'string' ? blob.rawText : lines.join('\n'),
  };
};

const normalizeCommit = (commit) => {
  if (!object(commit)) throw new Error('Repository adapter returned an invalid commit');
  return {
    sha: requiredString(commit.sha, 'commit SHA'),
    message: typeof commit.message === 'string' ? commit.message : '',
    author: typeof commit.author === 'string' ? commit.author : 'Unknown author',
    when: typeof commit.when === 'string' ? commit.when : '',
  };
};

export function normalizeRepositoryData(value) {
  if (!object(value) || !object(value.project)) throw new Error('Repository adapter returned no project metadata');
  const project = value.project;
  const branches = Array.isArray(value.branches) ? value.branches.map((branch) => requiredString(branch, 'branch name')) : [];
  if (!branches.length) throw new Error('Repository adapter returned no branches');
  const tree = Object.fromEntries(Object.entries(value.tree || {}).map(([path, entries]) => [path, Array.isArray(entries) ? entries.map(normalizeEntry) : []]));
  const blobs = Object.fromEntries(Object.entries(value.blobs || {}).map(([name, blob]) => [name, normalizeBlob(blob, name)]));
  return {
    project: {
      ...project,
      name: requiredString(project.name, 'project name'),
      visibility: typeof project.visibility === 'string' ? project.visibility : '',
      stars: Number.isFinite(project.stars) ? project.stars : 0,
      starred: Boolean(project.starred),
      forks: Number.isFinite(project.forks) ? project.forks : 0,
      commitCount: Number.isFinite(project.commitCount) ? project.commitCount : 0,
      branchCount: Number.isFinite(project.branchCount) ? project.branchCount : branches.length,
      tagCount: Number.isFinite(project.tagCount) ? project.tagCount : 0,
      storage: typeof project.storage === 'string' ? project.storage : '',
      cloneUrls: object(project.cloneUrls) ? project.cloneUrls : {},
    },
    languages: Array.isArray(value.languages) ? value.languages : [],
    branches,
    defaultBranch: requiredString(value.defaultBranch || branches[0], 'default branch'),
    tree,
    blobs,
    commits: Array.isArray(value.commits) ? value.commits.map(normalizeCommit) : [],
  };
}

export function assertRepositoryAdapter(adapter) {
  const missing = REPOSITORY_ADAPTER_METHODS.filter((method) => typeof adapter?.[method] !== 'function');
  if (missing.length) throw new Error(`Repository adapter is missing required methods: ${missing.join(', ')}`);
  return adapter;
}

export function createRepositoryAdapter(implementation) {
  assertRepositoryAdapter(implementation);
  return Object.freeze({
    async load(context) { return normalizeRepositoryData(await implementation.load(context)); },
    async loadBlob(context) { return normalizeBlob(await implementation.loadBlob(context), context?.path || ''); },
    async branches(context) {
      const result = await implementation.branches(context);
      if (!Array.isArray(result) || !result.length) throw new Error('Repository adapter returned no branches');
      return result.map((branch) => requiredString(branch, 'branch name'));
    },
    toggleStar: implementation.toggleStar.bind(implementation),
    fork: implementation.fork.bind(implementation),
    download: implementation.download.bind(implementation),
    deleteEntries: implementation.deleteEntries.bind(implementation),
  });
}

const projectApiPath = (projectPath, suffix = '') => `/api/v4/projects/${encodeURIComponent(requiredString(projectPath, 'project path'))}${suffix}`;
const responseData = (response) => response.data;
const decodeContent = (content) => (typeof content === 'string' && typeof atob === 'function' ? atob(content.replace(/\s/g, '')) : content || '');

export function createProjectRepositoryAdapter({ projectPath, ref = '', path = '', client = axios, navigate = window.location.assign.bind(window.location) } = {}) {
  const base = projectApiPath(projectPath);
  const request = (url, options = {}) => client.get(url, options).then(responseData);
  const loadProject = () => request(base);
  const loadBranches = () => request(`${base}/repository/branches`, { params: { per_page: 100 } });
  return createRepositoryAdapter({
    async load({ branch, path: currentPath } = {}) {
      const project = await loadProject();
      const selectedBranch = branch || ref || project.default_branch;
      const treePath = currentPath || path || '';
      const [branches, entries, commits, tags] = await Promise.all([
        loadBranches(),
        request(`${base}/repository/tree`, { params: { ref: selectedBranch, path: treePath || undefined, per_page: 100 } }),
        request(`${base}/repository/commits`, { params: { ref_name: selectedBranch, per_page: 20 } }),
        request(`${base}/repository/tags`, { params: { per_page: 20 } }),
      ]);
      return {
        project: { name: project.name, visibility: project.visibility, stars: project.star_count, starred: project.starred, forks: project.forks_count, commitCount: project.commit_count, branchCount: branches.length, tagCount: tags.length, storage: project.repository_storage, cloneUrls: { https: project.http_url_to_repo, ssh: project.ssh_url_to_repo } },
        branches: branches.map((item) => item.name),
        defaultBranch: project.default_branch,
        tree: { [treePath]: entries.map((entry) => ({ name: entry.name, kind: entry.type === 'tree' ? 'dir' : 'file', path: entry.path })) },
        commits: commits.map((commit) => ({ sha: commit.short_id || commit.id, message: commit.title || commit.message, author: commit.author_name || commit.author_email, when: commit.committed_date || commit.created_at })),
      };
    },
    async loadBlob({ path: filePath, branch } = {}) {
      const file = await request(`${base}/repository/files/${encodeURIComponent(requiredString(filePath, 'file path'))}`, { params: { ref: branch || ref } });
      return { name: file.file_name, path: file.file_path, bytes: file.size, rawText: decodeContent(file.content) };
    },
    async branches() { return (await loadBranches()).map((item) => item.name); },
    async toggleStar() { const project = await loadProject(); return client.post(`${base}/${project.starred ? 'unstar' : 'star'}`).then(responseData); },
    async fork() { return client.post(`${base}/fork`).then(responseData); },
    async download({ branch } = {}) { navigate(`${base}/repository/archive?sha=${encodeURIComponent(branch || ref)}`); return {}; },
    async deleteEntries() { throw new Error('Delete files from their dedicated repository route.'); },
  });
}

/** Adapter for a Rails JSON endpoint set supplied by the host view. */
export function createRailsRepositoryAdapter({ routes, fetcher = globalThis.fetch, context = {} } = {}) {
  if (!object(routes) || typeof fetcher !== 'function') throw new Error('Rails repository adapter requires routes and fetch');
  const request = async (name, options = {}) => {
    const url = routes[name];
    if (typeof url !== 'string' || !url) throw new Error(`Rails repository route is not configured: ${name}`);
    const csrf = typeof document !== 'undefined' ? document.querySelector('meta[name="csrf-token"]')?.content : null;
    const response = await fetcher(url, { credentials: 'same-origin', headers: { Accept: 'application/json', 'Content-Type': 'application/json', ...(csrf ? { 'X-CSRF-Token': csrf } : {}) }, ...options });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload.message || `Repository request ${name} failed (${response.status})`);
    return payload;
  };
  return createRepositoryAdapter({
    async load(params) { return request('load', { method: 'POST', body: JSON.stringify({ ...context, ...params }) }); },
    async loadBlob(params) { return request('blob', { method: 'POST', body: JSON.stringify({ ...context, ...params }) }); },
    async branches(params) { const result = await request('branches', { method: 'POST', body: JSON.stringify({ ...context, ...params }) }); return result.branches; },
    async toggleStar(params) { return request('toggleStar', { method: 'POST', body: JSON.stringify({ ...context, ...params }) }); },
    async fork(params) { return request('fork', { method: 'POST', body: JSON.stringify({ ...context, ...params }) }); },
    async download(params) { return request('download', { method: 'POST', body: JSON.stringify({ ...context, ...params }) }); },
    async deleteEntries(params) { return request('deleteEntries', { method: 'POST', body: JSON.stringify({ ...context, ...params }) }); },
  });
}

/** Adapter for an already configured GitLab GraphQL client. */
export function createGraphqlRepositoryAdapter({ client, queries, context = {} } = {}) {
  if (!client || typeof client.query !== 'function' || !object(queries)) throw new Error('GraphQL repository adapter requires a configured client and query documents');
  const query = (name, variables) => {
    if (!queries[name]) throw new Error(`GraphQL repository query is not configured: ${name}`);
    return client.query({ query: queries[name], variables: { ...context, ...variables }, fetchPolicy: 'network-only' }).then((result) => result.data);
  };
  const mutate = (name, variables) => {
    if (!queries[name]) throw new Error(`GraphQL repository mutation is not configured: ${name}`);
    if (typeof client.mutate !== 'function') throw new Error('GraphQL repository client does not support mutations');
    return client.mutate({ mutation: queries[name], variables: { ...context, ...variables } }).then((result) => result.data);
  };
  return createRepositoryAdapter({
    async load(params) { return query('load', params); },
    async loadBlob(params) { return query('blob', params); },
    async branches(params) { const result = await query('branches', params); return result.branches; },
    async toggleStar(params) { return mutate('toggleStar', params); },
    async fork(params) { return mutate('fork', params); },
    async download(params) { return mutate('download', params); },
    async deleteEntries(params) { return mutate('deleteEntries', params); },
  });
}
