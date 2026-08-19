/**
 * View model for the Manage surface (Activity + Labels), ported from Manage.dc.html's
 * renderVals(). Field names mirror GitLab's real Events and Labels API payloads so a
 * live fetch can replace these fixtures without changing how the components consume them.
 */

export const MANAGE_TABS = Object.freeze([
  { id: 'activity', label: 'Activity' },
  { id: 'labels', label: 'Labels' },
]);

// Icon name (a key in MgIcon's local set — see components/MgIcon.vue) -> semantic
// token, used to tint the activity feed's trailing icon.
const EVENT_ICON_ACCENT = Object.freeze({
  commit: 'neutral',
  merge: 'primary',
  check_circle: 'good',
  chat: 'neutral',
  shield: 'error',
  tag: 'primary',
  cloud: 'good',
});

export function eventIconAccent(icon) {
  return EVENT_ICON_ACCENT[icon] || 'neutral';
}

export function initialsOf(name) {
  return String(name || '')
    .trim()
    .split(/\s+/)
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

export function formatRelativeTime(iso, now = Date.now()) {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return '';
  const diffMs = Math.max(0, now - then);
  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;
  const week = 7 * day;
  const month = 30 * day;
  const year = 365 * day;
  if (diffMs < minute) return 'just now';
  if (diffMs < hour) return `${Math.floor(diffMs / minute)}m ago`;
  if (diffMs < day) return `${Math.floor(diffMs / hour)}h ago`;
  if (diffMs < week) return `${Math.floor(diffMs / day)}d ago`;
  if (diffMs < month) return `${Math.floor(diffMs / week)}w ago`;
  if (diffMs < year) return `${Math.floor(diffMs / month)}mo ago`;
  return `${Math.floor(diffMs / year)}y ago`;
}

/** Text corpus used for both plain/regex list filtering and the regex builder's sample. */
export function eventCorpus(event) {
  return `${event.author.name} ${event.actionName} ${event.targetTitle}`;
}

export function labelCorpus(label) {
  return `${label.name} ${label.description}`;
}

export function createSearchMatcher({ query, regexMode }) {
  if (!query) return { test: () => true, valid: true, error: '' };
  if (!regexMode) {
    const needle = query.toLowerCase();
    return { test: (text) => text.toLowerCase().includes(needle), valid: true, error: '' };
  }
  try {
    const expression = new RegExp(query, 'i');
    return { test: (text) => expression.test(text), valid: true, error: '' };
  } catch (error) {
    // Invalid pattern: fail open (show everything) rather than hide content behind a broken filter.
    return { test: () => true, valid: false, error: error.message };
  }
}

export function createInitialEvents() {
  const hour = 3600 * 1000;
  const day = 24 * hour;
  const now = Date.now();
  return [
    { id: 'ev-1', author: { name: 'Jun Park', initials: initialsOf('Jun Park') }, actionName: 'pushed to', targetTitle: 'perf/board-virtual', targetUrl: '#/code', createdAt: new Date(now - 2 * hour).toISOString(), icon: 'commit' },
    { id: 'ev-2', author: { name: 'Dana Weiss', initials: initialsOf('Dana Weiss') }, actionName: 'opened merge request', targetTitle: '!1285 tonal container colors', targetUrl: '#/plan/merge_requests', createdAt: new Date(now - 6 * hour).toISOString(), icon: 'merge' },
    { id: 'ev-3', author: { name: 'Omar Haddad', initials: initialsOf('Omar Haddad') }, actionName: 'closed issue', targetTitle: '#4275 wiki sidebar collapses', targetUrl: '#/plan/issues', createdAt: new Date(now - 1 * day).toISOString(), icon: 'check_circle' },
    { id: 'ev-4', author: { name: 'Priya Nair', initials: initialsOf('Priya Nair') }, actionName: 'commented on', targetTitle: '#4312 boards render slowly', targetUrl: '#/plan/issues', createdAt: new Date(now - 1 * day).toISOString(), icon: 'chat' },
    { id: 'ev-5', author: { name: 'Security bot', initials: initialsOf('Security bot') }, actionName: 'created vulnerability finding in', targetTitle: 'issues search parameter', targetUrl: '#/secure', createdAt: new Date(now - 2 * day).toISOString(), icon: 'shield' },
    { id: 'ev-6', author: { name: 'Jun Park', initials: initialsOf('Jun Park') }, actionName: 'created tag', targetTitle: 'v17.2.0', targetUrl: '#/code', createdAt: new Date(now - 7 * day).toISOString(), icon: 'tag' },
    { id: 'ev-7', author: { name: 'CI', initials: initialsOf('CI') }, actionName: 'deployed to', targetTitle: 'production', targetUrl: '#/operate', createdAt: new Date(now - 7 * day).toISOString(), icon: 'cloud' },
  ];
}

export function createInitialLabels() {
  return [
    { id: 'lb-1', name: 'frontend', description: 'Vue, JS, and template work', color: '#e8def8', textColor: '#4f378b', openIssuesCount: 12 },
    { id: 'lb-2', name: 'backend', description: 'Rails, services, workers', color: '#e5e1ec', textColor: '#49454f', openIssuesCount: 9 },
    { id: 'lb-3', name: 'performance', description: 'Speed and memory', color: '#fff3d0', textColor: '#9a6700', openIssuesCount: 7 },
    { id: 'lb-4', name: 'bug', description: 'Something is broken', color: '#f9dedc', textColor: '#b3261e', openIssuesCount: 8 },
    { id: 'lb-5', name: 'a11y', description: 'Accessibility', color: '#dcf2e3', textColor: '#1a7f37', openIssuesCount: 4 },
    { id: 'lb-6', name: 'ci', description: 'Pipelines and runners', color: '#fff3d0', textColor: '#9a6700', openIssuesCount: 3 },
    { id: 'lb-7', name: 'search', description: 'Search and regex features', color: '#d7e9f7', textColor: '#1a5e8f', openIssuesCount: 5 },
  ];
}

/** Placeholder routes — swap for real Rails paths once this surface is mounted in-app. */
export const DEFAULT_MANAGE_ROUTES = Object.freeze({
  members: '#/manage/members',
  manage: '#/manage',
  overview: '#/overview',
  plan: '#/plan',
  code: '#/code',
  build: '#/build',
  secure: '#/secure',
  deploy: '#/deploy',
  operate: '#/operate',
  monitor: '#/monitor',
  analyze: '#/analyze',
  settings: '#/settings',
});

export const DEFAULT_SIDEBAR_ITEMS = Object.freeze([
  { id: 'overview', label: 'Project overview', icon: 'home', route: 'overview' },
  { id: 'manage', label: 'Manage', icon: 'group', route: 'manage' },
  { id: 'plan', label: 'Plan', icon: 'flag', route: 'plan' },
  { id: 'code', label: 'Code', icon: 'code', route: 'code' },
  { id: 'build', label: 'Build', icon: 'build', route: 'build' },
  { id: 'secure', label: 'Secure', icon: 'shield', route: 'secure' },
  { id: 'deploy', label: 'Deploy', icon: 'rocket', route: 'deploy' },
  { id: 'operate', label: 'Operate', icon: 'cloud', route: 'operate' },
  { id: 'monitor', label: 'Monitor', icon: 'monitor', route: 'monitor' },
  { id: 'analyze', label: 'Analyze', icon: 'chart', route: 'analyze' },
  { id: 'settings', label: 'Settings', icon: 'settings', route: 'settings' },
]);
