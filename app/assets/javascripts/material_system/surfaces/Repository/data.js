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
    kind: ['dir', 'submodule'].includes(entry.kind) ? entry.kind : 'file',
    sha: entry.sha || '',
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
    rawText: blob.binary ? null : typeof blob.rawText === 'string' ? blob.rawText : lines.join('\n'),
    binary: Boolean(blob.binary),
    rawPath: blob.rawPath || '',
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
  if (!branches.length && !value.emptyRepository && !value.defaultBranch) throw new Error('Repository adapter returned no branches');
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
      commitCount: Number.isFinite(project.commitCount) ? project.commitCount : null,
      branchCount: Number.isFinite(project.branchCount) ? project.branchCount : branches.length,
      tagCount: Number.isFinite(project.tagCount) ? project.tagCount : null,
      storage: typeof project.storage === 'string' ? project.storage : '',
      cloneUrls: object(project.cloneUrls) ? project.cloneUrls : {},
    },
    languages: Array.isArray(value.languages) ? value.languages : [],
    branches,
    defaultBranch: value.emptyRepository ? '' : requiredString(value.defaultBranch || branches[0], 'default branch'),
    emptyRepository: Boolean(value.emptyRepository),
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
    capabilities: { deleteEntries: implementation.capabilities?.deleteEntries === true },
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

const projectApiPath = (projectPath, suffix = '') => `${globalThis.gon?.relative_url_root || ''}/api/v4/projects/${encodeURIComponent(requiredString(projectPath, 'project path'))}${suffix}`;

export function decodeRepositoryContent(file) {
  if (file.encoding !== 'base64' || typeof file.content !== 'string') return { binary: true, rawText: null };
  const binary = atob(file.content.replace(/\s/g, ''));
  const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
  try {
    const rawText = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
    return rawText.includes('\0') ? { binary: true, rawText: null } : { binary: false, rawText };
  } catch (_error) { return { binary: true, rawText: null }; }
}

// Select only the public metadata rendered by this surface. Do not retrieve the
// REST Project entity, which includes privileged administration fields.
export const REPOSITORY_PROJECT_QUERY = `query MaterialRepositoryProject($fullPath: ID!) {
  project(fullPath: $fullPath) {
    id name visibility starCount forksCount httpUrlToRepo sshUrlToRepo
    repository { empty rootRef }
    statistics { commitCount repositorySize }
  }
}`;

export const REPOSITORY_STAR_MUTATION = `mutation MaterialRepositoryStar($projectId: ProjectID!, $starred: Boolean!) {
  starProject(input: { projectId: $projectId, starred: $starred }) { count errors }
}`;

export function createProjectRepositoryAdapter({ projectPath, ref = '', path = '', initialStarred = false, forkPath = '', canStar = false, client = axios, navigate = (url) => window.location.assign(url) } = {}) {
  const base = projectApiPath(projectPath);
  let starred = initialStarred;
  let projectId;
  const graphqlEndpoint = `${globalThis.gon?.relative_url_root || ''}/api/graphql`;
  const request = (url, options = {}) => client.get(url, options).then((response) => response.data);
  const graphql = async (query, variables) => {
    const { data } = await client.post(graphqlEndpoint, { query, variables });
    if (data?.errors?.length || !data?.data) throw new Error('The requested project fields are unavailable for your current access.');
    return data.data;
  };
  const loadProject = async () => {
    const { project } = await graphql(REPOSITORY_PROJECT_QUERY, { fullPath: projectPath });
    if (!project?.id || typeof project.name !== 'string' || typeof project.repository?.empty !== 'boolean') throw new Error('Project metadata is unavailable for your current access.');
    projectId = project.id;
    return {
      name: project.name, visibility: project.visibility,
      star_count: project.starCount, forks_count: project.forksCount,
      http_url_to_repo: project.httpUrlToRepo, ssh_url_to_repo: project.sshUrlToRepo,
      empty_repo: project.repository.empty, default_branch: project.repository.rootRef,
      statistics: project.statistics ? { commit_count: project.statistics.commitCount, repository_size: project.statistics.repositorySize } : null,
    };
  };
  const allPages = async (suffix, params = {}) => {
    const rows = []; let page = 1;
    do {
      const response = await client.get(base + suffix, { params: { ...params, per_page: 100, page } });
      if (!Array.isArray(response.data)) throw new Error('The repository response was not a collection.');
      rows.push(...response.data);
      const next = Number(response.headers?.['x-next-page']);
      if (!next) return rows;
      if (next <= page || next > 100) throw new Error('The repository collection exceeds its pagination limit. Narrow the request.');
      page = next;
    } while (page <= 100);
    return rows;
  };
  const loadBranches = () => allPages('/repository/branches');
  return createRepositoryAdapter({
    capabilities: { deleteEntries: false },
    async load({ branch, path: currentPath } = {}) {
      const project = await loadProject();
      const empty = project.empty_repo === true;
      const selectedBranch = branch || ref || project.default_branch;
      const treePath = currentPath !== undefined ? currentPath : path || '';
      const [branches, entries, commits, tags, languages] = empty ? [[], [], [], [], {}] : await Promise.all([
        loadBranches(),
        allPages('/repository/tree', { ref: selectedBranch, path: treePath || undefined }),
        request(`${base}/repository/commits`, { params: { ref_name: selectedBranch, per_page: 20 } }),
        allPages('/repository/tags'),
        request(`${base}/languages`),
      ]);
      return {
        project: { canStar, canFork: Boolean(forkPath), name: project.name, visibility: project.visibility, stars: project.star_count, starred, forks: project.forks_count, commitCount: project.statistics?.commit_count, branchCount: branches.length, tagCount: tags.length, storage: Number.isFinite(project.statistics?.repository_size) ? `${project.statistics.repository_size.toLocaleString()} bytes` : '', cloneUrls: { https: project.http_url_to_repo, ssh: project.ssh_url_to_repo } },
        emptyRepository: empty,
        branches: branches.map((item) => item.name),
        defaultBranch: selectedBranch || '',
        tree: { [treePath]: entries.map((entry) => ({ name: entry.name, kind: entry.type === 'tree' ? 'dir' : entry.type === 'commit' ? 'submodule' : 'file', path: entry.path, sha: entry.id })) },
        commits: commits.map((commit) => ({ sha: commit.short_id || commit.id, message: commit.title || commit.message, author: commit.author_name || commit.author_email, when: commit.committed_date || commit.created_at })),
        languages: Object.entries(languages || {}).filter(([, percent]) => Number.isFinite(percent)).map(([name, percent], index) => ({ name, percent, token: ['prim', 'good', 'warn', 'outl'][index % 4] })),
      };
    },
    async loadBlob({ path: filePath, branch } = {}) {
      const fileEndpoint = `${base}/repository/files/${encodeURIComponent(requiredString(filePath, 'file path'))}`;
      const selectedRef = branch || ref;
      const file = await request(fileEndpoint, { params: { ref: selectedRef } });
      return { name: file.file_name, path: file.file_path, bytes: file.size, ...decodeRepositoryContent(file), rawPath: `${fileEndpoint}/raw?${new URLSearchParams({ ref: selectedRef })}` };
    },
    async branches() { return (await loadBranches()).map((item) => item.name); },
    async toggleStar() {
      if (!projectId) await loadProject();
      const nextStarred = !starred;
      const result = await graphql(REPOSITORY_STAR_MUTATION, { projectId, starred: nextStarred });
      const count = Number(result.starProject?.count);
      if (!result.starProject || result.starProject.errors?.length || !Number.isFinite(count)) throw new Error('The star preference was not updated.');
      starred = nextStarred;
      return { project: { starred, stars: count } };
    },
    async fork() {
      if (!forkPath || !forkPath.startsWith('/') || forkPath.startsWith('//')) throw new Error('A permitted project fork form is not available.');
      const result = await navigate(forkPath);
      if (result === false) throw new Error('The fork form navigation was not accepted.');
      return { navigationRequested: true };
    },
    async download({ branch, entries = [] } = {}) {
      if (entries.length !== 1) throw new Error('Select exactly one file or directory to download.');
      const entry = entries[0];
      const selectedRef = requiredString(branch || ref, 'download ref');
      const selectedPath = requiredString(entry.path, 'download path');
      let url;
      if (entry.kind === 'file') url = `${base}/repository/files/${encodeURIComponent(selectedPath)}/raw?${new URLSearchParams({ ref: selectedRef })}`;
      else if (entry.kind === 'dir') url = `${base}/repository/archive?${new URLSearchParams({ sha: selectedRef, path: selectedPath })}`;
      else throw new Error('Submodules must be downloaded from their source repository.');
      const navigationResult = await navigate(url);
      if (navigationResult === false) throw new Error('The download navigation was not accepted.');
      return { requested: true, path: selectedPath };
    },
    async deleteEntries() { throw new Error('Use the file edit workflow to commit a deletion.'); },
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
