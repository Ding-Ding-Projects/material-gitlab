/**
 * View model for the Admin surface, ported from Admin.dc.html's `state` and
 * `renderVals()`. Kept as plain data plus pure functions — no closures, no
 * Vue — so a real Admin API can replace the in-memory arrays and the row
 * mappers without touching Admin.vue or any sub-component.
 */

export const ADMIN_TABS = Object.freeze(['Overview', 'Users', 'Runners', 'Projects']);

export const STAT_CARDS = Object.freeze([
  { id: 'users', value: '1,204', label: 'Users' },
  { id: 'groups', value: '96', label: 'Groups' },
  { id: 'projects', value: '312', label: 'Projects' },
  { id: 'runners', value: '4', label: 'Runners' },
  { id: 'version', value: '17.2.0', label: 'Version' },
  { id: 'uptime', value: '99.98%', label: 'Uptime 30d' },
]);

export const INSTANCE_HEALTH = Object.freeze([
  { id: 'database', label: 'Database', status: 'good', note: 'pg 16 · 12ms median' },
  { id: 'redis', label: 'Redis', status: 'good', note: '7.2 · 0.4ms' },
  { id: 'gitaly', label: 'Gitaly', status: 'good', note: 'v17.2 · all storages healthy' },
  { id: 'sidekiq', label: 'Sidekiq', status: 'warn', note: 'queue latency 42s on imports' },
  { id: 'background-migrations', label: 'Background migrations', status: 'good', note: '0 pending' },
]);

export function createInitialUsers() {
  return [
    { id: 'dweiss', name: 'Dana Weiss', sub: '@dweiss · dweiss@acme.dev · Owner', role: 'Admin', blocked: false },
    { id: 'junpark', name: 'Jun Park', sub: '@junpark · junpark@acme.dev', role: 'Regular', blocked: false },
    { id: 'ohaddad', name: 'Omar Haddad', sub: '@ohaddad · ohaddad@acme.dev', role: 'Regular', blocked: false },
    { id: 'pnair', name: 'Priya Nair', sub: '@pnair · pnair@acme.dev', role: 'Regular', blocked: false },
    { id: 'ctmp', name: 'contractor-tmp', sub: '@ctmp · expired engagement', role: 'External', blocked: true },
  ];
}

export function createInitialRunners() {
  return [
    {
      id: 'saas-linux-medium-amd64',
      name: 'saas-linux-medium-amd64',
      sub: 'shared · docker · 4 concurrent',
      status: 'online',
      jobs: '2 running',
    },
    {
      id: 'saas-linux-large-amd64',
      name: 'saas-linux-large-amd64',
      sub: 'shared · docker · 2 concurrent',
      status: 'online',
      jobs: '1 running',
    },
    {
      id: 'macos-signing-01',
      name: 'macos-signing-01',
      sub: 'project · shell · signing prohibited by policy',
      status: 'paused',
      jobs: '—',
    },
    {
      id: 'legacy-vm-runner',
      name: 'legacy-vm-runner',
      sub: 'shared · last contact 26 days ago',
      status: 'offline',
      jobs: '—',
    },
  ];
}

export function createInitialProjects() {
  return [
    {
      id: 'acme-corp/phoenix-api',
      name: 'acme-corp/phoenix-api',
      sub: 'Internal · 96.2 MB · 9 members',
      when: 'active 2h ago',
      archived: false,
    },
    {
      id: 'acme-corp/phoenix-web',
      name: 'acme-corp/phoenix-web',
      sub: 'Internal · 214 MB · 14 members',
      when: 'active 1h ago',
      archived: false,
    },
    {
      id: 'acme-corp/design-tokens',
      name: 'acme-corp/design-tokens',
      sub: 'Public · 4.1 MB · 6 members',
      when: 'active 3d ago',
      archived: false,
    },
    {
      id: 'sandbox/old-spike',
      name: 'sandbox/old-spike',
      sub: 'Private · archived',
      when: 'active 8mo ago',
      archived: true,
    },
  ];
}

export function createInitialState(overrides = {}) {
  return {
    tab: 'Overview',
    search: '',
    searchRegexMode: false,
    searchBuilderOpen: false,
    listQuery: '',
    listRegexMode: false,
    listBuilderOpen: false,
    paletteOpen: false,
    notificationsOpen: false,
    confirmRequest: null,
    selectedByTab: { Users: [], Runners: [], Projects: [] },
    // Production mounts must provide server-backed data.  Keep the empty
    // collections here so a missing payload is an honest empty state rather
    // than silently showing the design fixture.
    users: [],
    runners: [],
    projects: [],
    ...overrides,
  };
}

/** Plain-text or regex predicate over a row's searchable text, mirrors the design's matcher(). */
export function createTextMatcher(query, regexMode) {
  if (!query) return { test: () => true, invalid: false };
  if (!regexMode) {
    const needle = query.toLowerCase();
    return { test: (text) => text.toLowerCase().includes(needle), invalid: false };
  }
  try {
    const re = new RegExp(query, 'i');
    return { test: (text) => re.test(text), invalid: false };
  } catch (_error) {
    return { test: () => true, invalid: true };
  }
}

export const userSearchText = (user) => `${user.name} ${user.sub} ${user.role}`;
export const runnerSearchText = (runner) => `${runner.name} ${runner.sub} ${runner.status}`;
export const projectSearchText = (project) => `${project.name} ${project.sub}`;

/** Every entity name in the instance — the top search field's regex builder sample corpus. */
export function fullCorpus({ users, runners, projects }) {
  return [...users.map((u) => u.name), ...runners.map((r) => r.name), ...projects.map((p) => p.name)];
}

/** Just the active tab's entity names — the list filter's own, narrower sample corpus. */
export function corpusForTab(tab, { users, runners, projects }) {
  if (tab === 'Users') return users.map((u) => u.name);
  if (tab === 'Runners') return runners.map((r) => r.name);
  if (tab === 'Projects') return projects.map((p) => p.name);
  return [];
}

const RUNNER_STATUS_TONE = { online: 'good', paused: 'warn', offline: 'danger' };

export function userRow(user) {
  return {
    id: user.id,
    icon: 'person',
    tone: user.blocked ? 'danger' : 'primary',
    title: user.name,
    titleMono: false,
    sub: user.sub,
    badge: user.blocked
      ? { label: 'blocked', tone: 'danger' }
      : { label: user.role, tone: user.role === 'Admin' ? 'warn' : 'neutral' },
    meta: '',
    actionLabel: user.blocked ? 'Unblock' : 'Block',
    actionId: user.blocked ? 'unblock' : 'block',
    actionTone: user.blocked ? 'primary' : 'danger',
  };
}

export function runnerRow(runner) {
  return {
    id: runner.id,
    icon: 'bot',
    tone: 'primary',
    title: runner.name,
    titleMono: true,
    sub: runner.sub,
    badge: { label: runner.status, tone: RUNNER_STATUS_TONE[runner.status] || 'neutral' },
    meta: runner.jobs,
    actionLabel: runner.status === 'paused' ? 'Resume' : 'Pause',
    actionId: runner.status === 'paused' ? 'resume' : 'pause',
    actionTone: 'primary',
  };
}

export function projectRow(project) {
  return {
    id: project.id,
    icon: 'folder',
    tone: 'primary',
    title: project.name,
    titleMono: true,
    sub: project.sub,
    badge: project.archived ? { label: 'archived', tone: 'neutral' } : null,
    meta: project.when,
    actionLabel: project.archived ? 'Unarchive' : 'Archive',
    actionId: project.archived ? 'unarchive' : 'archive',
    actionTone: 'primary',
  };
}

const ROW_BUILDERS = { Users: userRow, Runners: runnerRow, Projects: projectRow };
const SEARCH_TEXT = { Users: userSearchText, Runners: runnerSearchText, Projects: projectSearchText };
const ENTITY_KEY = { Users: 'users', Runners: 'runners', Projects: 'projects' };

/** Filters + maps a tab's entity list to display rows in one place. */
export function rowsForTab(tab, state, matcher) {
  const key = ENTITY_KEY[tab];
  const build = ROW_BUILDERS[tab];
  const searchText = SEARCH_TEXT[tab];
  if (!key) return [];
  return state[key].filter((entity) => matcher.test(searchText(entity))).map(build);
}

/** Bulk actions offered per tab. `destructive` actions must route through a confirmation gate. */
export const BULK_ACTIONS = Object.freeze({
  Users: [
    { id: 'block', label: 'Block selected', tone: 'danger', destructive: true },
    { id: 'unblock', label: 'Unblock selected', tone: 'primary', destructive: false },
  ],
  Runners: [
    { id: 'pause', label: 'Pause selected', tone: 'primary', destructive: false },
    { id: 'resume', label: 'Resume selected', tone: 'primary', destructive: false },
    { id: 'remove', label: 'Remove selected', tone: 'danger', destructive: true },
  ],
  Projects: [
    { id: 'archive', label: 'Archive selected', tone: 'primary', destructive: false },
    { id: 'unarchive', label: 'Unarchive selected', tone: 'primary', destructive: false },
    { id: 'remove', label: 'Remove selected', tone: 'danger', destructive: true },
  ],
});

export function toggleUserBlocked(users, id) {
  return users.map((u) => (u.id === id ? { ...u, blocked: !u.blocked } : u));
}

export function setUsersBlocked(users, ids, blocked) {
  const idSet = new Set(ids);
  return users.map((u) => (idSet.has(u.id) ? { ...u, blocked } : u));
}

export function toggleRunnerPaused(runners, id) {
  return runners.map((r) => (r.id === id ? { ...r, status: r.status === 'paused' ? 'online' : 'paused' } : r));
}

export function setRunnersStatus(runners, ids, status) {
  const idSet = new Set(ids);
  return runners.map((r) => (idSet.has(r.id) ? { ...r, status } : r));
}

export function removeRunners(runners, ids) {
  const idSet = new Set(ids);
  return runners.filter((r) => !idSet.has(r.id));
}

export function toggleProjectArchived(projects, id) {
  return projects.map((p) => (p.id === id ? { ...p, archived: !p.archived } : p));
}

export function setProjectsArchived(projects, ids, archived) {
  const idSet = new Set(ids);
  return projects.map((p) => (idSet.has(p.id) ? { ...p, archived } : p));
}

export function removeProjects(projects, ids) {
  const idSet = new Set(ids);
  return projects.filter((p) => !idSet.has(p.id));
}

export const ACTION_VERBS = Object.freeze({
  block: 'block',
  unblock: 'unblock',
  pause: 'pause',
  resume: 'resume',
  archive: 'archive',
  unarchive: 'unarchive',
  remove: 'permanently remove',
});

export const ACTION_PAST_TENSE = Object.freeze({
  block: 'blocked',
  unblock: 'unblocked',
  pause: 'paused',
  resume: 'resumed',
  archive: 'archived',
  unarchive: 'unarchived',
  remove: 'permanently removed',
});

export const TAB_ENTITY_NOUN = Object.freeze({ Users: 'user', Runners: 'runner', Projects: 'project' });

export function entityNoun(tab, count) {
  const noun = TAB_ENTITY_NOUN[tab] || 'item';
  return count === 1 ? noun : `${noun}s`;
}

/** Command palette actions available on this surface: tab navigation plus the theme toggle. */
export function paletteDescriptors() {
  return [
    { id: 'theme', label: 'Toggle dark theme', icon: 'moon' },
    ...ADMIN_TABS.map((tab) => ({ id: `tab:${tab}`, label: `Admin: ${tab}`, icon: 'admin' })),
  ];
}
