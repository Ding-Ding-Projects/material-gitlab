/**
 * View model for the Operate surface (Environments, Kubernetes clusters, Terraform
 * states), ported from Operate.dc.html's renderVals(). Field names mirror GitLab's
 * real Environments/Clusters/Terraform-state API payloads so a live fetch can
 * replace these fixtures without changing how the components consume them.
 */

import { assertCollection, requestJson, requireEndpoint } from '../live-data';

export const OPERATE_TABS = Object.freeze([
  { id: 'environments', label: 'Environments', icon: 'cloud' },
  { id: 'kubernetes', label: 'Kubernetes', icon: 'hub' },
  { id: 'terraform', label: 'Terraform', icon: 'landscape' },
]);

// CSS custom property names (without the leading --op- prefix) for each status pill.
export const STATUS_META = Object.freeze({
  available: Object.freeze({ bg: 'goodc', fg: 'good', label: 'Available' }),
  deploying: Object.freeze({ bg: 'warnc', fg: 'warn', label: 'Deploying' }),
  stopped: Object.freeze({ bg: 'surfch', fg: 'onsurfv', label: 'Stopped' }),
  connected: Object.freeze({ bg: 'goodc', fg: 'good', label: 'Connected' }),
  degraded: Object.freeze({ bg: 'warnc', fg: 'warn', label: 'Degraded' }),
  locked: Object.freeze({ bg: 'warnc', fg: 'warn', label: 'Locked' }),
  unlocked: Object.freeze({ bg: 'goodc', fg: 'good', label: 'Unlocked' }),
});

export function statusMeta(status) {
  return STATUS_META[status] || STATUS_META.stopped;
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

/** Composed "sub" line for an environment row: version-or-ref plus a trailing note. */
export function environmentDetail(env) {
  const lead = env.version || env.ref;
  const trail = env.note || (env.ciNumber ? `deployed by CI #${env.ciNumber}` : '');
  return trail ? `${lead} · ${trail}` : lead;
}

export function tfStateDetail(state) {
  return state.lockedBy ? `locked by ${state.lockedBy} · ${state.version}` : state.version;
}

export function environmentCorpus(env) {
  return `${env.name} ${environmentDetail(env)}`;
}

export function clusterCorpus(cluster) {
  return `${cluster.name} ${cluster.detail}`;
}

export function tfStateCorpus(state) {
  return `${state.name} ${tfStateDetail(state)}`;
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

export function createInitialEnvironments() {
  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;
  const now = Date.now();
  return [
    { id: 'env-production', name: 'production', kind: 'production', version: 'v17.2.0', ciNumber: 8819, status: 'available', updatedAt: new Date(now - 7 * day).toISOString() },
    { id: 'env-staging', name: 'staging', kind: 'staging', ref: 'a41f9c2e', ciNumber: 8821, status: 'deploying', updatedAt: new Date(now - 2 * minute).toISOString() },
    { id: 'env-review-1285', name: 'review/mr-1285', kind: 'review', ref: '7be20d11', note: 'review app', status: 'available', updatedAt: new Date(now - 6 * hour).toISOString() },
    { id: 'env-review-1278', name: 'review/mr-1278', kind: 'review', ref: 'c9d1e770', note: 'pipeline failed', status: 'stopped', updatedAt: new Date(now - 2 * day).toISOString() },
  ];
}

export function createInitialClusters() {
  return [
    { id: 'cluster-prod-us-east', name: 'prod-us-east', detail: 'GKE 1.30 · agent connected · 12 nodes', status: 'connected' },
    { id: 'cluster-staging-shared', name: 'staging-shared', detail: 'EKS 1.29 · agent connected · 4 nodes', status: 'connected' },
    { id: 'cluster-legacy-cert', name: 'legacy-cert-based', detail: 'cert-based connection · deprecated', status: 'degraded' },
  ];
}

export function createInitialTerraformStates() {
  const minute = 60 * 1000;
  const day = 24 * minute * 60;
  const week = 7 * day;
  const now = Date.now();
  return [
    { id: 'tf-prod-network', name: 'prod-network', lockedBy: 'dweiss', version: 'v14', status: 'locked', updatedAt: new Date(now - 20 * minute).toISOString() },
    { id: 'tf-prod-cluster', name: 'prod-cluster', version: 'v31', status: 'unlocked', updatedAt: new Date(now - 1 * day).toISOString() },
    { id: 'tf-dns-zones', name: 'dns-zones', version: 'v8', status: 'unlocked', updatedAt: new Date(now - 2 * week).toISOString() },
  ];
}

/** Row shape shared by every resource list: icon/title/detail/status/meta/action. */
export function buildEnvironmentRows(environments) {
  return environments.map((env) => ({
    id: env.id,
    name: env.name,
    icon: 'cloud',
    detail: environmentDetail(env),
    status: env.status,
    meta: formatRelativeTime(env.updatedAt),
    actionKind: env.status === 'stopped' ? 'restart' : 'stop',
    actionLabel: env.status === 'stopped' ? 'Restart' : 'Stop',
    actionDestructive: env.status !== 'stopped',
  }));
}

export function buildClusterRows(clusters) {
  return clusters.map((cluster) => ({
    id: cluster.id,
    name: cluster.name,
    icon: 'hub',
    detail: cluster.detail,
    status: cluster.status,
    meta: '',
    actionKind: null,
    actionLabel: null,
    actionDestructive: false,
  }));
}

export function buildTerraformRows(states) {
  return states.map((state) => ({
    id: state.id,
    name: state.name,
    icon: 'landscape',
    detail: tfStateDetail(state),
    status: state.status,
    meta: formatRelativeTime(state.updatedAt),
    actionKind: state.status === 'locked' ? 'force_unlock' : 'lock',
    actionLabel: state.status === 'locked' ? 'Force unlock' : 'Lock',
    actionDestructive: state.status === 'locked',
  }));
}

export async function fetchOperateData({ endpoints, fetchImpl } = {}) {
  const [environments, clusters, terraform] = await Promise.all([
    requestJson(requireEndpoint(endpoints, 'environments'), { fetchImpl }),
    requestJson(requireEndpoint(endpoints, 'kubernetes'), { fetchImpl }),
    requestJson(requireEndpoint(endpoints, 'terraform'), { fetchImpl }),
  ]);
  return {
    environments: assertCollection(environments, 'environments'),
    clusters: assertCollection(clusters, 'Kubernetes clusters'),
    terraform: assertCollection(terraform, 'Terraform states'),
  };
}

/** Placeholder routes — swap for real Rails paths once this surface is mounted in-app. */
export const DEFAULT_OPERATE_ROUTES = Object.freeze({
  overview: '#/overview',
  manage: '#/manage',
  plan: '#/plan',
  code: '#/code',
  build: '#/build',
  secure: '#/secure',
  deploy: '#/deploy',
  operate: '#/operate',
  monitor: '#/monitor',
  analyze: '#/analyze',
  settings: '#/settings',
  issues: '#/plan/issues',
  mergeRequests: '#/plan/merge_requests',
  pipelines: '#/build/pipelines',
  repository: '#/code/repository',
  epics: '#/plan/epics',
  security: '#/secure/security',
  todos: '#/todos',
  admin: '#/admin',
  login: '#/users/sign_in',
  agentMemory: '#/agent-memory',
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

/** Command palette's static page index, ported from Command Palette.dc.html. */
export const COMMAND_PALETTE_PAGES = Object.freeze([
  { label: 'Issues', icon: 'list', routeKey: 'issues' },
  { label: 'Merge requests', icon: 'merge', routeKey: 'mergeRequests' },
  { label: 'Pipelines', icon: 'pipeline', routeKey: 'pipelines' },
  { label: 'Repository', icon: 'code', routeKey: 'repository' },
  { label: 'Code: branches, commits, tags', icon: 'tree', routeKey: 'code' },
  { label: 'Build: jobs, editor, schedules', icon: 'construction', routeKey: 'build' },
  { label: 'Plan: milestones, wiki', icon: 'flag', routeKey: 'plan' },
  { label: 'Deploy: releases, flags, registry', icon: 'release', routeKey: 'deploy' },
  { label: 'Operate: environments, k8s', icon: 'cloud', routeKey: 'operate' },
  { label: 'Monitor: incidents, alerts', icon: 'monitoring', routeKey: 'monitor' },
  { label: 'Analyze: value stream, insights', icon: 'funnel', routeKey: 'analyze' },
  { label: 'Secure: dependencies, audit', icon: 'policy', routeKey: 'secure' },
  { label: 'Settings', icon: 'settings', routeKey: 'settings' },
  { label: 'Epics & roadmap', icon: 'map', routeKey: 'epics' },
  { label: 'Security dashboard', icon: 'security', routeKey: 'security' },
  { label: 'To-Do list', icon: 'check_all', routeKey: 'todos' },
  { label: 'Manage: activity, labels', icon: 'history', routeKey: 'manage' },
  { label: 'Admin area', icon: 'admin', routeKey: 'admin' },
  { label: 'Sign in', icon: 'login', routeKey: 'login' },
  { label: 'Agent Memory console', icon: 'memory', routeKey: 'agentMemory' },
]);

/** Regex builder quick-insert snippets, ported verbatim from Regex Builder.dc.html. */
export const REGEX_SNIPPET_GROUPS = Object.freeze([
  { name: 'Classes', items: [['\\d', 'digit 0-9'], ['\\w', 'word char'], ['\\s', 'whitespace'], ['[a-z]', 'range'], ['[^ ]', 'not space'], ['.', 'any char']] },
  { name: 'Quantifiers', items: [['*', 'zero+'], ['+', 'one+'], ['?', 'optional'], ['{2,5}', '2 to 5'], ['*?', 'lazy zero+'], ['+?', 'lazy one+']] },
  { name: 'Anchors', items: [['^', 'line start'], ['$', 'line end'], ['\\b', 'word boundary'], ['\\B', 'non-boundary']] },
  { name: 'Groups', items: [['( )', 'capture'], ['(?: )', 'non-capture'], ['(a|b)', 'alternation'], ['(?= )', 'lookahead'], ['(?! )', 'neg lookahead'], ['(?<= )', 'lookbehind']] },
  { name: 'Recipes', items: [['#\\d+', 'ref number'], ['\\d{2}:\\d{2}', 'duration'], ['(fail|error)', 'failures'], ['^ERROR', 'error lines'], ['\\bretry\\w*', 'retry words']] },
]).map((group) => Object.freeze({ ...group, items: group.items.map(([text, tip]) => Object.freeze({ text, tip })) }));

// Token -> plain-English description, longest/most-specific entries first so the
// scanner in explainPattern() below prefers "(?:" over the bare "(" it starts with.
const REGEX_TOKEN_DICTIONARY = Object.freeze([
  ['(?:', 'non-capturing group'], ['(?=', 'lookahead'], ['(?!', 'negative lookahead'],
  ['(?<=', 'lookbehind'], ['(?<!', 'negative lookbehind'], ['(', 'capturing group'], [')', 'end group'],
  ['[^', 'negated class'], ['[', 'character class'], [']', 'end class'],
  ['\\d', 'digit'], ['\\D', 'non-digit'], ['\\w', 'word char'], ['\\W', 'non-word char'],
  ['\\s', 'whitespace'], ['\\S', 'non-whitespace'], ['\\b', 'word boundary'], ['\\B', 'non-boundary'],
  ['.*', 'any chars (greedy)'], ['.+', 'one or more chars'], ['.', 'any char'],
  ['*?', 'zero+ (lazy)'], ['+?', 'one+ (lazy)'], ['*', 'zero or more'], ['+', 'one or more'],
  ['??', 'optional (lazy)'], ['?', 'optional'], ['^', 'start anchor'], ['$', 'end anchor'],
  ['|', 'alternation'], ['{', 'repetition {n,m}'],
]);

const REGEX_EXPLANATION_TOKEN_LIMIT = 24;

/** Walk a pattern left to right, describing each recognised token. Pure and bounded. */
export function explainPattern(pattern) {
  const explanation = [];
  let rest = String(pattern || '');
  while (rest.length && explanation.length < REGEX_EXPLANATION_TOKEN_LIMIT) {
    const hit = REGEX_TOKEN_DICTIONARY.find(([token]) => rest.startsWith(token));
    if (hit) {
      explanation.push({ token: hit[0], description: hit[1] });
      rest = rest.slice(hit[0].length);
      continue;
    }
    let literal = '';
    while (rest.length && !REGEX_TOKEN_DICTIONARY.some(([token]) => rest.startsWith(token))) {
      literal += rest[0];
      rest = rest.slice(1);
    }
    if (literal) explanation.push({ token: literal.slice(0, 8), description: `literal "${literal}"` });
  }
  return explanation;
}

export const DEFAULT_REGEX_TEST_TEXT = 'auth: login failed for user 42\npipeline #8812 passed in 04:31\nERROR TokenRefresh retry_count=3';
