/**
 * Code surface view model — ported from the Code.dc.html design's `renderVals()`.
 *
 * This module is intentionally framework-free and network-free: it holds seed
 * data plus pure mapping/filtering functions. The `fetch*` wrappers already
 * return Promises so a real API client can be swapped in behind the same
 * call sites without touching Code.vue or any sub-component.
 */

export const CODE_TABS = Object.freeze(['Branches', 'Commits', 'Tags', 'Compare', 'Snippets']);

export const DEFAULT_COMPARE_REFS = Object.freeze([
  'main',
  'perf/board-virtual',
  'fix/badge-contrast',
  'feat/mr-regex-search',
]);

export const PIPELINE_STATUS_META = Object.freeze({
  success: { icon: 'check_circle', color: 'var(--good)', containerColor: 'var(--goodc)', label: 'success' },
  running: { icon: 'sync', color: 'var(--warn)', containerColor: 'var(--warnc)', label: 'running' },
  failed: { icon: 'cancel', color: 'var(--err)', containerColor: 'var(--errc)', label: 'failed' },
});

const DEFAULT_BRANCHES = [
  { id: 'main', name: 'main', sub: 'default · protected', badge: 'protected', when: '2h ago', protected: true, deletable: false },
  { id: 'perf/board-virtual', name: 'perf/board-virtual', sub: 'a41f9c2e · Virtualize board column lists', badge: 'merged MR !1287', when: '2h ago', protected: false, deletable: true },
  { id: 'fix/badge-contrast', name: 'fix/badge-contrast', sub: '7be20d11 · Tonal container colors', badge: 'open MR !1285', when: '6h ago', protected: false, deletable: true },
  { id: 'feat/mr-regex-search', name: 'feat/mr-regex-search', sub: 'c9d1e770 · Regex mode for MR search', badge: 'open MR !1278', when: '2d ago', protected: false, deletable: true },
  { id: 'release/17-2', name: 'release/17-2', sub: 'protected · release branch', badge: 'protected', when: '1w ago', protected: true, deletable: false },
];

const DEFAULT_COMMITS = [
  { id: 'a41f9c2e', sha: 'a41f9c2e', message: 'Virtualize board column lists', author: 'Jun Park', when: '2h ago', pipelineStatus: 'success' },
  { id: 'c2d84b60', sha: 'c2d84b60', message: 'Update empty-state snapshots', author: 'Dana Weiss', when: '2h ago', pipelineStatus: 'success' },
  { id: '7be20d11', sha: '7be20d11', message: 'Move pipeline badges to tonal containers', author: 'Dana Weiss', when: '6h ago', pipelineStatus: 'running' },
  { id: '90c3aa17', sha: '90c3aa17', message: 'Backoff for state query polling', author: 'Omar Haddad', when: '1d ago', pipelineStatus: 'success' },
  { id: '5f01bd93', sha: '5f01bd93', message: 'Add regex search feature flag', author: 'Jun Park', when: '1d ago', pipelineStatus: 'failed' },
];

const DEFAULT_TAGS = [
  { id: 'v17.2.0', name: 'v17.2.0', sub: 'Release 17.2 · signed', when: '1w ago', deletable: true },
  { id: 'v17.1.2', name: 'v17.1.2', sub: 'Patch: poll backoff', when: '3w ago', deletable: true },
  { id: 'v17.1.1', name: 'v17.1.1', sub: 'Patch: favicon contrast', when: '1mo ago', deletable: true },
];

const DEFAULT_SNIPPETS = [
  { id: 'board-perf-test-script', name: 'Board perf test script', sub: '$ ruby bench/boards.rb --cards 700', visibility: 'private', when: '3d ago' },
  { id: 'regex-corpus-qa', name: 'Regex corpus for search QA', sub: '40 patterns with expected match counts', visibility: 'project', when: '5d ago' },
  { id: 'md3-token-bootstrap', name: 'MD3 token bootstrap', sub: 'CSS custom-property block for new surfaces', visibility: 'public', when: '1w ago' },
];

const clone = (value) => JSON.parse(JSON.stringify(value));

/** Mirrors the design's `matcher()` — plain substring search, or a forgiving regex. */
export function createMatcher(search, regexMode) {
  if (!search) return () => true;
  if (regexMode) {
    try {
      const re = new RegExp(search, 'i');
      return (text) => re.test(text);
    } catch (_error) {
      return () => true;
    }
  }
  const lowered = search.toLowerCase();
  return (text) => text.toLowerCase().includes(lowered);
}

export function filterBranches(branches, matcher) {
  return branches.filter((b) => matcher(`${b.name} ${b.sub}`));
}

export function filterCommits(commits, matcher) {
  return commits.filter((c) => matcher(`${c.sha} ${c.message} ${c.author}`));
}

export function filterTags(tags, matcher) {
  return tags.filter((t) => matcher(`${t.name} ${t.sub}`));
}

export function filterSnippets(snippets, matcher) {
  return snippets.filter((sn) => matcher(`${sn.name} ${sn.sub}`));
}

export function buildRegexCorpus({ branches, commits, tags, snippets }) {
  return [
    ...branches.map((b) => b.name),
    ...commits.map((c) => `${c.sha} ${c.message}`),
    ...tags.map((t) => t.name),
    ...snippets.map((sn) => sn.name),
  ];
}

/** Mirrors the design's `runCompare()` message logic. */
export function describeCompareResult(fromRef, toRef) {
  if (fromRef === toRef) return 'Source and target are identical.';
  return `${toRef} is ahead of ${fromRef} by 3 commits (+191 −37 across 4 files). Create a merge request to review the diff.`;
}

export async function fetchBranches() { return clone(DEFAULT_BRANCHES); }
export async function fetchCommits() { return clone(DEFAULT_COMMITS); }
export async function fetchTags() { return clone(DEFAULT_TAGS); }
export async function fetchSnippets() { return clone(DEFAULT_SNIPPETS); }

/** Simulates a compare-refs API call; a real client returns the same shape. */
export async function runCompareRequest(fromRef, toRef) {
  return { message: describeCompareResult(fromRef, toRef) };
}

export function createCodeSeedState() {
  return {
    branches: clone(DEFAULT_BRANCHES),
    commits: clone(DEFAULT_COMMITS),
    tags: clone(DEFAULT_TAGS),
    snippets: clone(DEFAULT_SNIPPETS),
  };
}
