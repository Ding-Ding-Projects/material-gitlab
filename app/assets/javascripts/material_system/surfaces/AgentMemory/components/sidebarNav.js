/**
 * Sidebar navigation data, ported from design/Sidebar.dc.html's own
 * renderVals(). Local to this surface (per-lane self-contained sidebar,
 * matching the pattern already used by sibling surfaces in this codebase).
 * Items inside the "Agent Memory" section carry a `tabId` and are handled
 * as in-page tab switches; every other item is an honest hash-route link.
 */
export const NAV_SECTIONS = [
  {
    name: 'Pinned',
    items: [
      { label: 'To-Do list', icon: 'check-box', href: '#/todos' },
      { label: 'Issues', icon: 'list', href: '#/issues' },
      { label: 'Merge requests', icon: 'merge', href: '#/merge_requests' },
    ],
  },
  {
    name: 'Manage',
    items: [
      { label: 'Activity', icon: 'undo', href: '#/activity' },
      { label: 'Members', icon: 'group', href: '#/settings/members' },
      { label: 'Labels', icon: 'label', href: '#/labels' },
    ],
  },
  {
    name: 'Plan',
    items: [
      { label: 'Issues', icon: 'list', href: '#/issues' },
      { label: 'Boards', icon: 'chip', href: '#/boards' },
      { label: 'Milestones', icon: 'flag', href: '#/milestones' },
      { label: 'Iterations', icon: 'sync', href: '#/iterations' },
      { label: 'Wiki', icon: 'book', href: '#/wiki' },
      { label: 'Requirements', icon: 'check-box', href: '#/requirements' },
      { label: 'Epics & roadmap', icon: 'map', href: '#/epics' },
    ],
  },
  {
    name: 'Code',
    items: [
      { label: 'Merge requests', icon: 'merge', href: '#/merge_requests' },
      { label: 'Repository', icon: 'document', href: '#/repository' },
      { label: 'Branches', icon: 'merge', href: '#/branches' },
      { label: 'Commits', icon: 'circle', href: '#/commits' },
      { label: 'Tags', icon: 'label', href: '#/tags' },
      { label: 'Compare', icon: 'tune', href: '#/compare' },
      { label: 'Snippets', icon: 'document', href: '#/snippets' },
    ],
  },
  {
    name: 'Build',
    items: [
      { label: 'Pipelines', icon: 'sync', href: '#/pipelines' },
      { label: 'Jobs', icon: 'tune', href: '#/jobs' },
      { label: 'Pipeline editor', icon: 'pencil', href: '#/ci/editor' },
      { label: 'Schedules', icon: 'undo', href: '#/pipeline_schedules' },
      { label: 'Test cases', icon: 'sparkle', href: '#/test_cases' },
      { label: 'Artifacts', icon: 'package', href: '#/artifacts' },
    ],
  },
  {
    name: 'Secure',
    items: [
      { label: 'Security dashboard', icon: 'shield', href: '#/security' },
      { label: 'Vulnerability report', icon: 'bug', href: '#/vulnerabilities' },
      { label: 'Dependency list', icon: 'merge', href: '#/dependencies' },
      { label: 'Audit events', icon: 'document', href: '#/audit_events' },
      { label: 'Scan policies', icon: 'shield', href: '#/policies' },
    ],
  },
  {
    name: 'Deploy',
    items: [
      { label: 'Releases', icon: 'rocket', href: '#/releases' },
      { label: 'Feature flags', icon: 'power', href: '#/feature_flags' },
      { label: 'Package registry', icon: 'package', href: '#/packages' },
      { label: 'Container registry', icon: 'cloud', href: '#/container_registry' },
    ],
  },
  {
    name: 'Operate',
    items: [
      { label: 'Environments', icon: 'cloud', href: '#/environments' },
      { label: 'Kubernetes clusters', icon: 'chip', href: '#/clusters' },
      { label: 'Terraform states', icon: 'map', href: '#/terraform_states' },
    ],
  },
  {
    name: 'Monitor',
    items: [
      { label: 'Incidents', icon: 'warning', href: '#/incidents' },
      { label: 'Alerts', icon: 'warning', href: '#/alerts' },
      { label: 'Error tracking', icon: 'warning', href: '#/error_tracking' },
      { label: 'On-call schedules', icon: 'robot', href: '#/oncall_schedules' },
      { label: 'Service desk', icon: 'robot', href: '#/service_desk' },
    ],
  },
  {
    name: 'Analyze',
    items: [
      { label: 'Value stream', icon: 'chart', href: '#/value_stream' },
      { label: 'CI/CD analytics', icon: 'chart', href: '#/ci_cd_analytics' },
      { label: 'Repository analytics', icon: 'chip', href: '#/repository_analytics' },
      { label: 'Contributors', icon: 'group', href: '#/contributors' },
      { label: 'Insights', icon: 'sparkle', href: '#/insights' },
    ],
  },
  {
    name: 'Agent Memory',
    items: [
      { label: 'Memory console', icon: 'chip', tabId: 'instructions' },
      { label: 'Status hub', icon: 'robot', tabId: 'status' },
      { label: 'Skills catalog', icon: 'cap', tabId: 'skills' },
    ],
  },
  {
    name: 'Settings',
    items: [
      { label: 'Project settings', icon: 'tune', href: '#/settings' },
      { label: 'CI/CD', icon: 'sync', href: '#/settings/ci_cd' },
      { label: 'Integrations', icon: 'puzzle', href: '#/settings/integrations' },
    ],
  },
  {
    name: 'Instance',
    items: [
      { label: 'Admin area', icon: 'shield', href: '#/admin' },
      { label: 'Sign in', icon: 'login', href: '#/users/sign_in' },
    ],
  },
];
