/**
 * View model for the Agent Memory surface, ported from the design file's
 * `renderVals()`. Every list is exposed through a thin async "fetch*"
 * wrapper so a real API client can replace the in-memory array one call at a
 * time without touching the components that consume it.
 */

let historyRevisionCounter = 49;

export const SYNC_TARGETS = [
  {
    id: 'claude-code',
    runtime: 'Claude Code',
    path: '~/.claude/rules/agent-guidance.md',
    status: 'in-sync',
    statusLabel: 'in sync',
  },
  {
    id: 'codex',
    runtime: 'Codex',
    path: '~/.codex/AGENTS.md',
    status: 'in-sync',
    statusLabel: 'in sync',
  },
  {
    id: 'opencode',
    runtime: 'OpenCode',
    path: '~/.config/opencode/AGENTS.md',
    status: 'stale',
    statusLabel: 'stale · r47',
  },
];

export const INSTRUCTION_BLOCKS = [
  {
    id: 'block-working-agreement',
    title: 'Shared working agreement',
    summary: 'Managed instruction block · unique delimiters preserved (LF/CRLF/CR)',
    lines: 212,
  },
  {
    id: 'block-status-page',
    title: 'Status page preference',
    summary: 'One stable live status card per substantial task, updated in place',
    lines: 34,
  },
  {
    id: 'block-delegation',
    title: 'Delegation lifecycle',
    summary: 'Orchestrated bounded task sessions with follow-up steering',
    lines: 58,
  },
  {
    id: 'block-presentation',
    title: 'Presentation preferences',
    summary: 'Bold status headings; private aliases never copied to public artifacts',
    lines: 41,
  },
  {
    id: 'block-search',
    title: 'Search requirements',
    summary: 'Regex builder in every search bar · Ctrl+Shift+F palette on every surface',
    lines: 27,
  },
];

export const SKILLS = [
  {
    id: 'skill-agent-global-memory',
    name: 'agent-global-memory',
    icon: 'chip',
    description: 'Canonical instructions, sync, backup, and recovery workflows.',
    status: 'installed',
    removable: false,
  },
  {
    id: 'skill-line5-ride-counter',
    name: 'line5-ride-counter',
    icon: 'tram',
    description: 'Focused counting workflow triggered from ordinary task language.',
    status: 'installed',
    removable: true,
  },
  {
    id: 'skill-mat-day',
    name: 'mat-day',
    icon: 'sparkle',
    description: 'Authorized-cleanup presentation overlay for every workflow.',
    status: 'installed',
    removable: true,
  },
  {
    id: 'skill-yum-lerng-cha',
    name: 'yum-lerng-cha',
    icon: 'rocket',
    description: 'Ultra-speed feature-or-fix release lane with background CI monitoring.',
    status: 'installed',
    removable: true,
  },
  {
    id: 'skill-yum-tong',
    name: 'yum-tong',
    icon: 'power',
    description: 'Release-grade shutdown workflow with exhaustive proof.',
    status: 'installed',
    removable: true,
  },
  {
    id: 'skill-fun-gow',
    name: 'fun-gow',
    icon: 'puzzle',
    description: 'Repo-local convenience skill mirrored for Codex and Claude.',
    status: 'repo-local',
    removable: true,
  },
];

// `minutesAgo` seeds a real timestamp at load time so elapsed-time display
// keeps advancing for as long as the surface stays open, instead of a static
// string that goes stale the moment the page is left running.
export const SESSIONS = [
  {
    id: 1,
    agent: 'Claude Code · lane 1',
    statusTone: 'good',
    live: true,
    minutesAgo: 0,
    task: 'MD3 rewrite — issues & boards surfaces',
    baseline: 'v0.1.2810 verified',
    evidence: 'capture 2026-08-14T09:12Z',
    gate: 'MR !1285 review',
  },
  {
    id: 2,
    agent: 'Slop Machine · task 8812',
    statusTone: 'warn',
    live: false,
    minutesAgo: 12,
    task: 'Jest shard 2/4 flake bisect',
    baseline: 'commit a41f9c2e',
    evidence: 'CI run 30929821528',
    gate: 'green rerun ×3',
  },
  {
    id: 3,
    agent: 'OpenCode · docs',
    statusTone: 'good',
    live: false,
    minutesAgo: 60,
    task: 'Regex search spec draft',
    baseline: 'doc/ tree 5f01bd93',
    evidence: '2 captures linked',
    gate: 'maintainer sign-off',
  },
  {
    id: 4,
    agent: 'Claude Code · lane 2',
    statusTone: 'neutral',
    live: false,
    archived: true,
    minutesAgo: null,
    task: 'Token layer and theming (epic &14)',
    baseline: 'closed 100%',
    evidence: 'release notes v17.2',
    gate: '—',
  },
];

export const HISTORY_ENTRIES = [
  { id: 'r48', icon: 'sync', title: 'Managed block replaced after canonical sync', when: 'today 09:02' },
  { id: 'r47', icon: 'save', title: 'Timestamped backup before replacement', when: 'today 09:02' },
  { id: 'r46', icon: 'pencil', title: 'Added regex-builder preference to search requirements', when: 'yesterday' },
  { id: 'r45', icon: 'cap', title: 'Installed skill yum-tong', when: '3d ago' },
  { id: 'r44', icon: 'undo', title: 'Restored r41 as new revision (status heading rule)', when: '1w ago' },
];

export const SYNC_STEPS = [
  { key: 'verify', label: 'Verify canonical origin', note: 'github.com/Ding-Ding-Projects' },
  { key: 'backup', label: 'Create timestamped backup', note: '~/.claude/rules/*.bak' },
  { key: 'block', label: 'Replace managed instruction block', note: 'delimiters preserved' },
  { key: 'skills', label: 'Install owned skills catalog', note: `${SKILLS.length} skills` },
];

export const TABS = [
  { key: 'instructions', label: 'Instructions' },
  { key: 'skills', label: 'Skills' },
  { key: 'status', label: 'Status Hub' },
  { key: 'sync', label: 'Sync' },
  { key: 'history', label: 'History' },
];

const clone = (value) => JSON.parse(JSON.stringify(value));
const delay = (value, ms = 120) => new Promise((resolve) => setTimeout(() => resolve(value), ms));

// Thin async wrappers so a real API client can replace these one at a time
// without changing anything that calls them.
export const fetchSyncTargets = () => delay(clone(SYNC_TARGETS));
export const fetchInstructionBlocks = () => delay(clone(INSTRUCTION_BLOCKS));
export const fetchSkills = () => delay(clone(SKILLS));
export const fetchSessions = () => delay(clone(SESSIONS));
export const fetchHistoryEntries = () => delay(clone(HISTORY_ENTRIES));
export const fetchSyncSteps = () => delay(clone(SYNC_STEPS));

export const nextHistoryRevisionId = () => `r${historyRevisionCounter++}`;

/** Renders elapsed time the same way the design's session cards do. */
export function formatRelativeTime(session, now = Date.now()) {
  if (session.archived) return 'archived';
  if (session.live) return 'live';
  if (session.minutesAgo == null) return '—';
  const elapsedMs = now - session.startedAt;
  const minutes = Math.max(session.minutesAgo, Math.floor(elapsedMs / 60000));
  if (minutes < 1) return 'moments ago';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

/** Stamps each session with a real `startedAt` so relative time can advance. */
export function withStartedAt(sessions, now = Date.now()) {
  return sessions.map((session) => ({
    ...session,
    startedAt: session.minutesAgo == null ? null : now - session.minutesAgo * 60000,
  }));
}
