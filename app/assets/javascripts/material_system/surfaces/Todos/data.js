/**
 * View model for the To-Do list surface. Shapes match what a real API response
 * would look like, so `createSeedTodos()` is the only thing a live data source
 * needs to replace (see `docs/` for the intended GET /api/v4/todos mapping).
 */

export const TODO_VIEWS = Object.freeze({ PENDING: 'pending', DONE: 'done' });

const TONE_BY_ICON = Object.freeze({
  cancel: 'error',
  security: 'error',
  verified: 'success',
});

/** Maps a to-do's icon name to a semantic tone token consumed by TodoListItem. */
export function resolveTodoTone(icon) {
  return TONE_BY_ICON[icon] || 'primary';
}

/** Sample to-dos matching the design's mock data. Replace with a real API call. */
export function createSeedTodos() {
  return [
    {
      id: 1,
      actor: 'Dana Weiss',
      action: 'assigned you merge request',
      target: { label: '!1285 tonal container colors', href: '#/merge_requests/1285' },
      project: 'acme-corp/phoenix-api',
      when: '2h ago',
      icon: 'call_merge',
      state: TODO_VIEWS.PENDING,
    },
    {
      id: 2,
      actor: 'Omar Haddad',
      action: 'mentioned you on issue',
      target: { label: '#4312 boards render slowly', href: '#/issues/4312' },
      project: 'acme-corp/phoenix-api',
      when: '4h ago',
      icon: 'alternate_email',
      state: TODO_VIEWS.PENDING,
    },
    {
      id: 3,
      actor: 'Pipeline',
      action: 'failed for',
      target: { label: '#8820 fix/badge-contrast', href: '#/pipelines/8820' },
      project: 'acme-corp/phoenix-api',
      when: '6h ago',
      icon: 'cancel',
      state: TODO_VIEWS.PENDING,
    },
    {
      id: 4,
      actor: 'Priya Nair',
      action: 'requested review on',
      target: { label: '!1278 regex mode for MR search', href: '#/merge_requests/1278' },
      project: 'acme-corp/phoenix-api',
      when: '1d ago',
      icon: 'rate_review',
      state: TODO_VIEWS.PENDING,
    },
    {
      id: 5,
      actor: 'Security bot',
      action: 'reported a critical finding in',
      target: { label: 'issues search parameter', href: '#/security' },
      project: 'acme-corp/phoenix-api',
      when: '2d ago',
      icon: 'security',
      state: TODO_VIEWS.PENDING,
    },
    {
      id: 6,
      actor: 'Jun Park',
      action: 'approved your merge request',
      target: { label: '!1281 poll backoff', href: '#/merge_requests/1281' },
      project: 'acme-corp/phoenix-api',
      when: '3d ago',
      icon: 'verified',
      state: TODO_VIEWS.DONE,
    },
  ];
}

/** Flat text a search/regex matcher runs against for a given to-do. */
export function todoSearchText(todo) {
  return `${todo.actor} ${todo.action} ${todo.target.label}`;
}

/**
 * Plain-text-by-default, opt-in-regex matcher factory shared by every search
 * field on this surface (main to-do search and the sidebar quick-open box).
 * An invalid regex never hides data — it degrades to "show everything".
 */
export function createTextMatcher(query, regexMode) {
  if (!query) return () => true;
  if (regexMode) {
    try {
      const re = new RegExp(query, 'i');
      return (text) => re.test(text);
    } catch (_error) {
      return () => true;
    }
  }
  const lowered = query.toLowerCase();
  return (text) => text.toLowerCase().includes(lowered);
}

export function isValidRegex(query) {
  try {
    // eslint-disable-next-line no-new
    new RegExp(query);
    return true;
  } catch (_error) {
    return false;
  }
}

/** Primary navigation, ported from the design's Sidebar mock (hrefs are local routes). */
export function createNavSections() {
  const section = (name, items) => ({
    name,
    items: items.map(([label, icon, href]) => ({ label, icon, href })),
  });
  return [
    section('Pinned', [
      ['To-Do list', 'done_all', '#/todos'],
      ['Issues', 'list_alt', '#/issues'],
      ['Merge requests', 'call_merge', '#/merge_requests'],
    ]),
    section('Manage', [
      ['Activity', 'history', '#/activity'],
      ['Members', 'group', '#/members'],
      ['Labels', 'label', '#/labels'],
    ]),
    section('Plan', [
      ['Issues', 'list_alt', '#/issues'],
      ['Boards', 'view_kanban', '#/boards'],
      ['Milestones', 'flag', '#/milestones'],
      ['Iterations', 'update', '#/iterations'],
      ['Wiki', 'menu_book', '#/wiki'],
      ['Requirements', 'fact_check', '#/requirements'],
      ['Epics & roadmap', 'map', '#/epics'],
    ]),
    section('Code', [
      ['Merge requests', 'call_merge', '#/merge_requests'],
      ['Repository', 'code', '#/repository'],
      ['Branches', 'account_tree', '#/branches'],
      ['Commits', 'commit', '#/commits'],
      ['Tags', 'sell', '#/tags'],
      ['Compare', 'difference', '#/compare'],
      ['Snippets', 'sticky_note_2', '#/snippets'],
    ]),
    section('Build', [
      ['Pipelines', 'conveyor_belt', '#/pipelines'],
      ['Jobs', 'construction', '#/jobs'],
      ['Pipeline editor', 'edit_note', '#/pipeline_editor'],
      ['Schedules', 'calendar_clock', '#/schedules'],
      ['Test cases', 'labs', '#/test_cases'],
      ['Artifacts', 'inventory_2', '#/artifacts'],
    ]),
    section('Secure', [
      ['Security dashboard', 'security', '#/security'],
      ['Vulnerability report', 'bug_report', '#/vulnerabilities'],
      ['Dependency list', 'account_tree', '#/dependencies'],
      ['Audit events', 'receipt_long', '#/audit_events'],
      ['Scan policies', 'policy', '#/scan_policies'],
    ]),
    section('Deploy', [
      ['Releases', 'new_releases', '#/releases'],
      ['Feature flags', 'toggle_on', '#/feature_flags'],
      ['Package registry', 'package_2', '#/packages'],
      ['Container registry', 'deployed_code', '#/container_registry'],
    ]),
    section('Operate', [
      ['Environments', 'cloud', '#/environments'],
      ['Kubernetes clusters', 'hub', '#/kubernetes'],
      ['Terraform states', 'landscape', '#/terraform'],
    ]),
    section('Monitor', [
      ['Incidents', 'e911_emergency', '#/incidents'],
      ['Alerts', 'notification_important', '#/alerts'],
      ['Error tracking', 'error', '#/error_tracking'],
      ['On-call schedules', 'phone_in_talk', '#/on_call'],
      ['Service desk', 'support_agent', '#/service_desk'],
    ]),
    section('Analyze', [
      ['Value stream', 'conversion_path', '#/value_stream'],
      ['CI/CD analytics', 'monitoring', '#/ci_analytics'],
      ['Repository analytics', 'database', '#/repo_analytics'],
      ['Contributors', 'diversity_3', '#/contributors'],
      ['Insights', 'lightbulb', '#/insights'],
    ]),
    section('Settings', [
      ['Project settings', 'settings', '#/settings'],
      ['CI/CD', 'conveyor_belt', '#/settings/ci_cd'],
      ['Integrations', 'extension', '#/settings/integrations'],
    ]),
  ];
}

/** Destination pages offered by the command palette, ported from the design mock. */
export function createPaletteDestinations() {
  return [
    ['To-Do list', 'done_all', '#/todos'],
    ['Issues', 'list_alt', '#/issues'],
    ['Merge requests', 'call_merge', '#/merge_requests'],
    ['Pipelines', 'conveyor_belt', '#/pipelines'],
    ['Repository', 'code', '#/repository'],
    ['Code: branches, commits, tags', 'account_tree', '#/code'],
    ['Build: jobs, editor, schedules', 'construction', '#/build'],
    ['Plan: milestones, wiki', 'flag', '#/plan'],
    ['Deploy: releases, flags, registry', 'new_releases', '#/deploy'],
    ['Operate: environments, k8s', 'cloud', '#/operate'],
    ['Monitor: incidents, alerts', 'monitoring', '#/monitor'],
    ['Analyze: value stream, insights', 'conversion_path', '#/analyze'],
    ['Secure: dependencies, audit', 'policy', '#/secure'],
    ['Settings', 'settings', '#/settings'],
    ['Epics & roadmap', 'map', '#/epics'],
    ['Security dashboard', 'security', '#/security'],
    ['Manage: activity, labels', 'history', '#/manage'],
  ].map(([label, icon, href]) => ({ label, icon, href, kind: 'Page' }));
}
