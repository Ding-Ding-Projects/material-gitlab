/**
 * View model for the MergeRequests surface, ported from the design's DCLogic
 * `renderVals()`. Pure helpers operate on plain merge-request objects so a
 * real GraphQL/REST layer can replace `fetchMergeRequests()` and the mutation
 * helpers below without touching any component.
 */

// The signed-in avatar chip in the top bar is a static placeholder in the
// source design, independent from the mock "authored by me" author name.
export const CURRENT_USER_NAME = 'Jun Park';
export const CURRENT_USER_AVATAR_INITIALS = 'JD';

export const MERGE_REQUEST_STATES = Object.freeze(['Open', 'Merged', 'Closed']);

export const PIPELINE_STATUS_META = Object.freeze({
  success: Object.freeze({ icon: 'check_circle', colorVar: '--mr-good', label: 'Pipeline passed' }),
  running: Object.freeze({ icon: 'sync', colorVar: '--mr-warn', label: 'Pipeline running' }),
  failed: Object.freeze({ icon: 'cancel', colorVar: '--mr-err', label: 'Pipeline failed' }),
});

export const DETAIL_TABS = Object.freeze([
  { id: 'overview', label: 'Overview' },
  { id: 'changes', label: 'Changes' },
  { id: 'discussion', label: 'Discussion' },
]);

export const FILTER_DEFS = Object.freeze([
  { key: 'open', label: 'Open' },
  { key: 'merged', label: 'Merged' },
  { key: 'mine', label: 'Authored by me' },
]);

export const MERGE_PHRASES = Object.freeze([
  'Merging! Drum roll, please…',
  'Merging! We’re almost there…',
  'Merging! Changes will land soon…',
  'Merging! Lift-off in 5… 4… 3…',
]);

export const DEFAULT_FILTERS = Object.freeze({ open: true, merged: false, mine: false });

function seedMergeRequests() {
  return [
    {
      id: 1,
      iid: 1287,
      title: 'Virtualize board column lists',
      branch: 'perf/board-virtual',
      target: 'main',
      state: 'Open',
      author: 'Jun Park',
      when: '2h ago',
      pipeline: 'success',
      approvals: '2/2',
      approvedByMe: true,
      canMerge: true,
      body: 'Replaces the naive v-for over cards with a virtualized list. Scroll FPS on a 700-card board goes from 22 to 58 on the reference machine.',
      files: [
        {
          name: 'board_column.vue',
          add: 64,
          del: 31,
          lines: [
            [210, ' ', 'const visible = computed(() => {'],
            [211, '-', '  return props.cards'],
            [211, '+', '  const {start, end} = range.value'],
            [212, '+', '  return props.cards.slice(start, end)'],
            [213, ' ', '})'],
          ],
        },
        {
          name: 'virtual_scroll.js',
          add: 118,
          del: 0,
          lines: [
            [1, '+', 'export function useVirtualRange(el, rowH) {'],
            [2, '+', '  const range = ref({start: 0, end: 40})'],
            [3, '+', '  // recompute on scroll + resize'],
            [4, '+', '  return range'],
            [5, '+', '}'],
          ],
        },
      ],
      threads: [
        {
          author: 'Dana Weiss',
          when: '1h ago',
          text: 'Row height is hardcoded to 96 — label-heavy cards wrap to two rows. Measure the first card instead?',
          resolved: false,
        },
        {
          author: 'Jun Park',
          when: '40m ago',
          text: 'Good catch, switched to a ResizeObserver on the first rendered card.',
          resolved: true,
        },
      ],
    },
    {
      id: 2,
      iid: 1285,
      title: 'Move pipeline badges to tonal container colors',
      branch: 'fix/badge-contrast',
      target: 'main',
      state: 'Open',
      author: 'Dana Weiss',
      when: '6h ago',
      pipeline: 'running',
      approvals: '1/2',
      approvedByMe: false,
      canMerge: false,
      body: 'Success/failed badges now use the MD3 container pairs, fixing the AA contrast failure in dark mode reported in #4308.',
      files: [
        {
          name: 'ci_badge.vue',
          add: 12,
          del: 9,
          lines: [
            [34, '-', '  background: $green-500;'],
            [34, '+', '  background: var(--goodc);'],
            [35, '-', '  color: white;'],
            [35, '+', '  color: var(--good);'],
          ],
        },
      ],
      threads: [
        {
          author: 'Omar Haddad',
          when: '3h ago',
          text: 'Does this cover the favicon variants under app/assets/images/ci_favicons too?',
          resolved: false,
        },
      ],
    },
    {
      id: 3,
      iid: 1281,
      title: 'Retry-backoff for state query polling',
      branch: 'fix/poll-backoff',
      target: 'main',
      state: 'Merged',
      author: 'Omar Haddad',
      when: '1d ago',
      pipeline: 'success',
      approvals: '2/2',
      approvedByMe: true,
      canMerge: false,
      body: 'Applies STATE_QUERY_POLLING_INTERVAL_BACKOFF (1.2) to the widget poll loop so idle tabs back off from the default 5s interval.',
      files: [
        {
          name: 'stores/poll.js',
          add: 9,
          del: 2,
          lines: [
            [18, '-', '  setTimeout(poll, 5000)'],
            [18, '+', '  delay = Math.min(delay * 1.2, 60000)'],
            [19, '+', '  setTimeout(poll, delay)'],
          ],
        },
      ],
      threads: [],
    },
    {
      id: 4,
      iid: 1278,
      title: 'Regex mode for MR search bar',
      branch: 'feat/mr-regex-search',
      target: 'main',
      state: 'Open',
      author: 'Jun Park',
      when: '2d ago',
      pipeline: 'failed',
      approvals: '0/2',
      approvedByMe: false,
      canMerge: false,
      body: 'Adds the shared regex builder to the merge request list search, matching the issues list behavior.',
      files: [
        {
          name: 'mr_search.vue',
          add: 41,
          del: 6,
          lines: [
            [12, '+', 'const re = buildRegex(query, flags)'],
            [13, '+', 'if (!re) return showError()'],
          ],
        },
      ],
      threads: [
        {
          author: 'Dana Weiss',
          when: '1d ago',
          text: 'Pipeline is red — the jest snapshot for the empty state needs an update.',
          resolved: false,
        },
      ],
    },
  ];
}

/**
 * Simulates the network round trip a real GraphQL/REST call would make.
 * Swap this for an Apollo query without changing any consuming component.
 */
export function fetchMergeRequests() {
  return Promise.resolve(seedMergeRequests());
}

export function avatarInitials(name) {
  return String(name)
    .split(' ')
    .filter(Boolean)
    .map((word) => word[0])
    .join('')
    .toUpperCase();
}

export function searchableText(mr) {
  return `${mr.title} ${mr.branch} !${mr.iid}`;
}

export function buildQueryMatcher(query, regexMode) {
  if (!query) return () => true;
  if (regexMode) {
    try {
      const re = new RegExp(query, 'i');
      return (text) => re.test(text);
    } catch (_error) {
      return () => false;
    }
  }
  const needle = query.toLowerCase();
  return (text) => text.toLowerCase().includes(needle);
}

export function matchesFilters(mr, filters) {
  const stateMatches =
    (filters.open && mr.state === 'Open') ||
    (filters.merged && mr.state === 'Merged') ||
    (!filters.open && !filters.merged);
  const authorMatches = !filters.mine || mr.author === CURRENT_USER_NAME;
  return stateMatches && authorMatches;
}

export function stateVisuals(state) {
  if (state === 'Merged') return { icon: 'call_merge', colorVar: '--mr-prim' };
  if (state === 'Closed') return { icon: 'block', colorVar: '--mr-err' };
  return { icon: 'adjust', colorVar: '--mr-good' };
}

export function toggleApproval(mr) {
  const approving = !mr.approvedByMe;
  const [approvedCount, requiredCount] = mr.approvals.split('/').map(Number);
  const nextApproved = Math.max(0, Math.min(requiredCount, approvedCount + (approving ? 1 : -1)));
  return {
    ...mr,
    approvedByMe: approving,
    approvals: `${nextApproved}/${requiredCount}`,
    canMerge: approving && nextApproved >= requiredCount && mr.pipeline === 'success',
  };
}

export function markMerged(mr) {
  return { ...mr, state: 'Merged', canMerge: false };
}

export function appendComment(mr, text, authorName = CURRENT_USER_NAME) {
  const trimmed = text.trim();
  if (!trimmed) return mr;
  return {
    ...mr,
    threads: [...mr.threads, { author: authorName, when: 'just now', text: trimmed, resolved: false }],
  };
}

export function toggleThreadResolved(mr, threadIndex) {
  return {
    ...mr,
    threads: mr.threads.map((thread, index) =>
      index === threadIndex ? { ...thread, resolved: !thread.resolved } : thread,
    ),
  };
}

export function closeMergeRequests(mrs, ids) {
  const idSet = new Set(ids);
  return mrs.map((mr) => (idSet.has(mr.id) && mr.state === 'Open' ? { ...mr, state: 'Closed', canMerge: false } : mr));
}

export function unresolvedThreadCount(mr) {
  return mr.threads.filter((thread) => !thread.resolved).length;
}
