import axios from '~/lib/utils/axios_utils';

function requireProjectPath(projectPath) { if (typeof projectPath !== 'string' || !projectPath.trim()) throw new Error('A project path is required.'); }

export function createCodeClient(projectPath, http = axios) {
  requireProjectPath(projectPath);
  const prefix = globalThis.gon?.relative_url_root || '';
  const base = `${prefix}/api/v4/projects/${encodeURIComponent(projectPath)}`;
  const allPages = async (suffix, params = {}) => {
    const rows = []; let page = 1;
    do {
      const response = await http.get(base + suffix, { params: { ...params, per_page: 100, page } });
      if (!Array.isArray(response.data)) throw new Error('The Code API response was not a collection.');
      rows.push(...response.data);
      const next = Number(response.headers?.['x-next-page']);
      if (!next) return rows;
      if (next <= page || next > 100) throw new Error('The Code collection exceeds its pagination limit. Narrow the query.');
      page = next;
    } while (page <= 100);
    return rows;
  };
  const remove = async (url) => {
    const response = await http.delete(url);
    if (!response || response.status < 200 || response.status >= 300 || !Number.isFinite(response.status)) throw new Error('The server did not confirm deletion.');
    return response;
  };
  return {
    listBranches: (params) => allPages('/repository/branches', params),
    listCommits: (params) => allPages('/repository/commits', params),
    listTags: (params) => allPages('/repository/tags', params),
    listSnippets: (params) => allPages('/snippets', params),
    compare: (from, to) => http.get(base + '/repository/compare', { params: { from, to } }).then((response) => response.data),
    async deleteBranch(name) {
      const url = `${base}/repository/branches/${encodeURIComponent(name)}`;
      const { data } = await http.get(url);
      if (data.protected || data.default) throw new Error('Protected and default branches cannot be deleted here.');
      return remove(url);
    },
    async deleteTag(name) {
      const url = `${base}/repository/tags/${encodeURIComponent(name)}`;
      const { data } = await http.get(url);
      if (data.protected) throw new Error('Protected tags cannot be deleted here.');
      return remove(url);
    },
    deleteSnippet: (id) => remove(`${base}/snippets/${encodeURIComponent(id)}`),
  };
}

export async function deleteCodeEntities({ entities, ids, operation, canDelete = () => true }) {
  const deleted = []; const failed = []; const skipped = [];
  for (const id of [...new Set(ids)]) {
    const entity = entities.find((item) => item.id === id);
    if (!entity || !canDelete(entity)) { skipped.push(id); continue; }
    try { await operation(entity); deleted.push(id); }
    catch (error) { failed.push({ id, message: error?.response?.data?.message || error.message || 'Deletion failed.' }); }
  }
  return { deleted, failed, skipped };
}

export const CODE_TABS = Object.freeze(['Branches', 'Commits', 'Tags', 'Compare', 'Snippets']);
export const PIPELINE_STATUS_META = Object.freeze({
  success: { icon: 'check_circle', color: 'var(--good)', containerColor: 'var(--goodc)', label: 'success' },
  running: { icon: 'sync', color: 'var(--warn)', containerColor: 'var(--warnc)', label: 'running' },
  failed: { icon: 'cancel', color: 'var(--err)', containerColor: 'var(--errc)', label: 'failed' },
});

export const DEFAULT_COMPARE_REFS = Object.freeze([]);
export function createMatcher(search, regexMode) {
  if (!search) return () => true;
  if (regexMode) {
    try { const re = new RegExp(search, 'i'); return (text) => re.test(text); } catch (_error) { return () => false; }
  }
  const lowered = search.toLowerCase();
  return (text) => text.toLowerCase().includes(lowered);
}
export const filterBranches = (branches, matcher) => branches.filter((b) => matcher(`${b.name} ${b.sub}`));
export const filterCommits = (commits, matcher) => commits.filter((c) => matcher(`${c.sha} ${c.message} ${c.author}`));
export const filterTags = (tags, matcher) => tags.filter((t) => matcher(`${t.name} ${t.sub}`));
export const filterSnippets = (snippets, matcher) => snippets.filter((sn) => matcher(`${sn.name} ${sn.sub}`));
export function buildRegexCorpus({ branches = [], commits = [], tags = [], snippets = [] }) {
  return [...branches.map((b) => b.name), ...commits.map((c) => `${c.sha} ${c.message}`), ...tags.map((t) => t.name), ...snippets.map((sn) => sn.name)];
}

const relativeTime = (value) => value || '';
export function normalizeBranch(branch) {
  return { id: branch.name, name: branch.name, sub: `${branch.commit?.short_id || ''} · ${branch.commit?.title || ''}`, badge: branch.protected ? 'protected' : '', when: relativeTime(branch.commit?.committed_date), protected: Boolean(branch.protected), default: Boolean(branch.default), deletable: !branch.protected && !branch.default, webUrl: branch.web_url };
}
export function normalizeCommit(commit) {
  return { id: commit.id, sha: commit.short_id || commit.id, message: commit.title || commit.message || '', author: commit.author_name || commit.author_email || '', when: relativeTime(commit.created_at || commit.committed_date), pipelineStatus: commit.status || null, webUrl: commit.web_url };
}
export function normalizeTag(tag) {
  return { id: tag.name, name: tag.name, sub: `${tag.commit?.short_id || ''} · ${tag.commit?.title || ''}`, when: relativeTime(tag.commit?.created_at), protected: Boolean(tag.protected), deletable: !tag.protected };
}
export function normalizeSnippet(snippet) {
  return { id: snippet.id, name: snippet.title || snippet.file_name || '', sub: snippet.description || snippet.file_name || '', visibility: snippet.visibility || '', when: relativeTime(snippet.updated_at), webUrl: snippet.web_url };
}

export async function fetchBranches({ projectPath, params = {}, client = createCodeClient(projectPath) } = {}) { requireProjectPath(projectPath); return (await client.listBranches({ per_page: 50, ...params })).map(normalizeBranch); }
export async function fetchCommits({ projectPath, params = {}, client = createCodeClient(projectPath) } = {}) { requireProjectPath(projectPath); return (await client.listCommits({ per_page: 50, ...params })).map(normalizeCommit); }
export async function fetchTags({ projectPath, params = {}, client = createCodeClient(projectPath) } = {}) { requireProjectPath(projectPath); return (await client.listTags({ per_page: 50, ...params })).map(normalizeTag); }
export async function fetchSnippets({ projectPath, params = {}, client = createCodeClient(projectPath) } = {}) { requireProjectPath(projectPath); return (await client.listSnippets({ per_page: 50, ...params })).map(normalizeSnippet); }

export async function runCompareRequest(projectPath, fromRef, toRef, client = createCodeClient(projectPath)) {
  requireProjectPath(projectPath);
  const response = await client.compare(fromRef, toRef);
  if (response.compare_same_ref) return { message: 'Source and target are identical.', response };
  const commits = response.commits?.length ?? 0;
  const diffs = response.diffs?.length ?? 0;
  return { message: `Comparison includes ${commits} commit${commits === 1 ? '' : 's'} and ${diffs} changed file${diffs === 1 ? '' : 's'}.`, response };
}

export function createCodeState() { return { branches: [], commits: [], tags: [], snippets: [] }; }
