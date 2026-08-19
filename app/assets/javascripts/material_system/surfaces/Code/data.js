import { createGitLabClient, requireProjectPath } from '../gitlabApi';

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
  return { id: branch.name, name: branch.name, sub: `${branch.commit?.short_id || ''} · ${branch.commit?.title || ''}`, badge: branch.protected ? 'protected' : '', when: relativeTime(branch.commit?.committed_date), protected: branch.protected, deletable: !branch.protected };
}
export function normalizeCommit(commit) {
  return { id: commit.id, sha: commit.short_id || commit.id, message: commit.title || commit.message || '', author: commit.author_name || commit.author_email || '', when: relativeTime(commit.created_at || commit.committed_date), pipelineStatus: commit.status || 'success' };
}
export function normalizeTag(tag) {
  return { id: tag.name, name: tag.name, sub: `${tag.commit?.short_id || ''} · ${tag.commit?.title || ''}`, when: relativeTime(tag.commit?.created_at), deletable: true };
}
export function normalizeSnippet(snippet) {
  return { id: snippet.id, name: snippet.title || snippet.file_name || '', sub: snippet.description || snippet.file_name || '', visibility: snippet.visibility || '', when: relativeTime(snippet.updated_at), webUrl: snippet.web_url };
}

export async function fetchBranches({ projectPath, params = {}, client = createGitLabClient(projectPath) } = {}) { requireProjectPath(projectPath); return (await client.listBranches({ per_page: 50, ...params })).map(normalizeBranch); }
export async function fetchCommits({ projectPath, params = {}, client = createGitLabClient(projectPath) } = {}) { requireProjectPath(projectPath); return (await client.listCommits({ per_page: 50, ...params })).map(normalizeCommit); }
export async function fetchTags({ projectPath, params = {}, client = createGitLabClient(projectPath) } = {}) { requireProjectPath(projectPath); return (await client.listTags({ per_page: 50, ...params })).map(normalizeTag); }
export async function fetchSnippets({ projectPath, params = {}, client = createGitLabClient(projectPath) } = {}) { requireProjectPath(projectPath); return (await client.listSnippets({ per_page: 50, ...params })).map(normalizeSnippet); }

export async function runCompareRequest(projectPath, fromRef, toRef, client = createGitLabClient(projectPath)) {
  requireProjectPath(projectPath);
  const response = await client.compare(fromRef, toRef);
  if (response.compare_same_ref) return { message: 'Source and target are identical.', response };
  const commits = response.commits?.length ?? 0;
  const diffs = response.diffs?.length ?? 0;
  return { message: `${toRef} is ahead of ${fromRef} by ${commits} commit${commits === 1 ? '' : 's'} across ${diffs} file${diffs === 1 ? '' : 's'}.`, response };
}

export function createCodeState() { return { branches: [], commits: [], tags: [], snippets: [] }; }
