/** View model and GraphQL transport adapters for the To-Do list surface. */

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

const TODO_QUERY = `query materialTodos($state: [TodoStateEnum!], $first: Int, $after: String, $before: String, $last: Int) {
  currentUser {
    id
    todos(first: $first, last: $last, after: $after, before: $before, state: $state) {
      nodes {
        id state action createdAt targetType targetUrl
        author { id name webUrl }
        project { id nameWithNamespace }
        targetEntity { name ... on Issue { reference webPath } ... on MergeRequest { reference webPath } }
      }
      pageInfo { hasNextPage hasPreviousPage startCursor endCursor }
    }
  }
}`;

const config = () => {
  if (typeof window === 'undefined') return {};
  if (window.__MATERIAL_TODOS_CONFIG__) return window.__MATERIAL_TODOS_CONFIG__;
  const root = document.querySelector('[data-material-todos]');
  return root ? { ...root.dataset } : {};
};

const actionCopy = {
  assigned: 'assigned you', mentioned: 'mentioned you on', build_failed: 'failed for', review_requested: 'requested review on',
};

const normalizeTodo = (todo) => ({
  id: todo.id,
  actor: todo.author?.name || '',
  action: actionCopy[todo.action] || todo.action || '',
  target: { label: todo.targetEntity?.reference || todo.targetEntity?.name || '', href: todo.targetEntity?.webPath || todo.targetUrl || '#' },
  project: todo.project?.nameWithNamespace || '',
  when: todo.createdAt || '',
  icon: todo.action === 'build_failed' ? 'cancel' : todo.action === 'review_requested' ? 'rate_review' : 'alternate_email',
  state: todo.state,
  raw: todo,
});

export async function fetchTodos(options = {}) {
  const settings = { ...config(), ...options };
  const endpoint = settings.endpoint || settings.graphqlEndpoint || '/api/graphql';
  const request = settings.fetcher || (typeof fetch === 'function' ? fetch : null);
  if (!request) throw new Error('To-do data transport is unavailable');
  const response = await request(endpoint, {
    method: 'POST', credentials: 'same-origin',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
    body: JSON.stringify({ query: TODO_QUERY, variables: { state: options.state || ['pending'], first: options.first || 20, after: options.after || null, before: options.before || null, last: options.last || null } }),
  });
  if (!response.ok) throw new Error(`To-do request failed (${response.status})`);
  const payload = await response.json();
  if (payload.errors?.length) throw new Error(payload.errors.map((error) => error.message).join('; '));
  const todos = payload.data?.currentUser?.todos || {};
  return { todos: (todos.nodes || []).map(normalizeTodo), pageInfo: todos.pageInfo || {} };
}

export async function mutateTodoState({ id, state, options = {} }) {
  const settings = { ...config(), ...options };
  const endpoint = settings.mutationEndpoint || settings.graphqlEndpoint || '/api/graphql';
  const request = settings.fetcher || (typeof fetch === 'function' ? fetch : null);
  if (!request) throw new Error('To-do mutation transport is unavailable');
  const mutation = state === TODO_VIEWS.DONE ? 'todoMarkDone' : 'todoRestore';
  const response = await request(endpoint, {
    method: 'POST', credentials: 'same-origin',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
    body: JSON.stringify({ query: `mutation materialTodoState($id: TodoID!) { result: ${mutation}(input: { id: $id }) { todo { id state } errors } }`, variables: { id } }),
  });
  if (!response.ok) throw new Error(`To-do update failed (${response.status})`);
  const payload = await response.json();
  const errors = payload.errors || payload.data?.result?.errors || [];
  if (errors.length) throw new Error(errors.map((error) => error.message || error).join('; '));
  return payload.data?.result?.todo;
}

export async function mutateTodosState({ ids, state, options = {} }) {
  return Promise.all(ids.map((id) => mutateTodoState({ id, state, options })));
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
