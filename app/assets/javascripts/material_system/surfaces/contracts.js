/** Hand-written design-route evidence. Source registration and runtime evidence are separate. */
export const SHARED_SHELL_CONTRACTS = Object.freeze([
  Object.freeze({ id: 'surface.shell-a', reference: 'design/Shell A.dc.html', mount: '.m3-shell-topbar-host', kind: 'authenticated-shell' }),
  Object.freeze({ id: 'surface.shell-b', reference: 'design/Shell B.dc.html', mount: '.m3-shell-topbar-host', kind: 'authenticated-shell' }),
  Object.freeze({ id: 'surface.sidebar', reference: 'design/Sidebar.dc.html', mount: '.m3-shell-sidebar-host', kind: 'sidebar' }),
  Object.freeze({ id: 'surface.command-palette', reference: 'design/Command Palette.dc.html', mount: 'ShellB.vue', kind: 'embedded-overlay' }),
  Object.freeze({ id: 'surface.regex-builder', reference: 'design/Regex Builder.dc.html', mount: 'ShellB.vue', kind: 'embedded-overlay' }),
  Object.freeze({ id: 'surface.analyze', reference: 'design/Analyze.dc.html', mount: '#js-explore-analytics-dashboards', kind: 'analytics' }),
]);

export function validateSharedShellContracts(contracts = SHARED_SHELL_CONTRACTS) {
  const ids = new Set(contracts.map(({ id }) => id));
  const errors = contracts.flatMap((contract, index) => [!contract?.id && `contracts[${index}].id is required`, !contract?.reference && `contracts[${index}].reference is required`, !contract?.mount && `contracts[${index}].mount is required`].filter(Boolean));
  SHARED_SHELL_CONTRACTS.forEach(({ id }) => !ids.has(id) && errors.push(`missing shared-shell contract: ${id}`));
  return { valid: errors.length === 0, errors };
}

const notCaptured = 'not-captured';
const unresolved = (id, reference, status, limitation, extra = {}) => ({ id, reference, status, limitation, runtimeEvidence: notCaptured, ...extra });
const wired = (id, reference, route, view, entrypoint, importSource, initializer, host) => ({ id, reference, status: 'wired', route, view, entrypoint, importSource, initializer, host, runtimeEvidence: notCaptured });

// Literal row identities make missing checked-in design files fail closed. The helper only removes repeated evidence fields.
export const DESIGN_ROUTE_INTEGRATION_CONTRACTS = Object.freeze([
  wired('surface.admin', 'design/Admin.dc.html', '/admin', 'app/views/admin/dashboard/index.html.haml', 'app/assets/javascripts/pages/admin/dashboard/index.js', '~/material_system/surfaces/Admin', 'initAdminMaterial', '#js-material-admin'),
  wired('surface.agent-memory', 'design/Agent Memory.dc.html', '/-/agent_memory', 'app/views/agent_memory/index.html.haml', 'app/assets/javascripts/pages/agent_memory/index.js', '~/material_system/surfaces/AgentMemory', 'initAgentMemoryApp', '#js-material-agent-memory'),
  wired('surface.analyze', 'design/Analyze.dc.html', '/:namespace/:project/-/value_stream_analytics', 'app/views/projects/cycle_analytics/show.html.haml', 'app/assets/javascripts/pages/projects/cycle_analytics/show/index.js', '~/material_system/surfaces/Analyze', 'mountAnalyze', '#js-material-analyze'),
  wired('surface.build', 'design/Build.dc.html', '/:namespace/:project/-/jobs', 'app/views/projects/jobs/index.html.haml', 'app/assets/javascripts/pages/projects/jobs/index/index.js', '~/material_system/surfaces/Build', 'mountBuildSurface', '#js-material-build'),
  wired('surface.code', 'design/Code.dc.html', '/:namespace/:project/-/(branches|tags|commits)', 'app/views/projects/branches/index.html.haml', 'app/assets/javascripts/pages/projects/branches/index/index.js', '~/material_system/surfaces/Code', 'mountCodeSurface', '#js-material-code-app'),
  unresolved('surface.command-palette', 'design/Command Palette.dc.html', 'embedded', 'Embedded by ShellB instead of a standalone Rails route.', { entrypoint: 'app/assets/javascripts/material_system/surfaces/ShellB/ShellB.vue', importSource: '../CommandPalette/CommandPalette.vue', initializer: 'CommandPalette', host: '<command-palette>' }),
  wired('surface.deploy', 'design/Deploy.dc.html', '/:namespace/:project/-/releases', 'app/views/projects/releases/index.html.haml', 'app/assets/javascripts/pages/projects/releases/index/index.js', '~/material_system/surfaces/Deploy', 'mountDeploy', '#js-material-deploy'),
  wired('surface.epics', 'design/Epics.dc.html', '/groups/:id/-/epics', 'ee/app/views/groups/epics/index.html.haml', 'ee/app/assets/javascripts/pages/groups/epics/index/index.js', '~/material_system/surfaces/Epics', 'mountEpics', '#js-material-epics'),
  wired('surface.issues', 'design/Issues.dc.html', '/:namespace/:project/-/issues', 'app/views/projects/issues/index.html.haml', 'app/assets/javascripts/pages/projects/issues/material_index.js', '~/material_system/surfaces/Issues', 'initIssues', '[data-material-issues]'),
  unresolved('surface.login', 'design/Login.dc.html', 'server-rendered', 'Rails authentication partials render the login. mountLoginShell has no page-entry import and is not a Vue replacement.', { route: '/users/sign_in', view: 'app/views/devise/sessions/new.html.haml' }),
  wired('surface.manage', 'design/Manage.dc.html', '/:namespace/:project/-/manage', 'app/views/projects/manage.html.haml', 'app/assets/javascripts/pages/projects/manage.js', '~/material_system/surfaces/Manage', 'initManageMaterial', '#js-material-manage'),
  wired('surface.merge-requests', 'design/Merge Requests.dc.html', '/:namespace/:project/-/merge_requests', 'app/views/projects/merge_requests/index.html.haml', 'app/assets/javascripts/pages/projects/merge_requests/material_index.js', '~/material_system/surfaces/MergeRequests', 'initMergeRequests', '[data-material-merge-requests]'),
  wired('surface.monitor', 'design/Monitor.dc.html', '/:namespace/:project/-/alert_management', 'app/views/projects/alert_management/index.html.haml', 'app/assets/javascripts/pages/projects/alert_management/index/index.js', '~/material_system/surfaces/Monitor', 'mountMonitor', '#js-material-monitor'),
  wired('surface.operate', 'design/Operate.dc.html', '/:namespace/:project/-/environments', 'app/views/projects/environments/index.html.haml', 'app/assets/javascripts/pages/projects/environments/index/index.js', '~/material_system/surfaces/Operate', 'mountOperate', '#js-material-operate'),
  wired('surface.pipelines', 'design/Pipelines.dc.html', '/:namespace/:project/-/pipelines', 'app/views/projects/pipelines/index.html.haml', 'app/assets/javascripts/pages/projects/pipelines/index/index.js', '~/material_system/surfaces/Pipelines', 'mountPipelines', '#js-material-pipelines'),
  wired('surface.plan', 'design/Plan.dc.html', '/:namespace/:project/-/milestones', 'app/views/projects/milestones/index.html.haml', 'app/assets/javascripts/pages/projects/milestones/index/index.js', '~/material_system/surfaces/Plan', 'mountPlan', '[data-material-plan-project-id]'),
  unresolved('surface.regex-builder', 'design/Regex Builder.dc.html', 'embedded', 'Embedded by ShellB instead of a standalone Rails route.', { entrypoint: 'app/assets/javascripts/material_system/surfaces/ShellB/ShellB.vue', importSource: '../RegexBuilder/RegexBuilder.vue', initializer: 'RegexBuilder', host: '<regex-builder>' }),
  wired('surface.repository', 'design/Repository.dc.html', '/:namespace/:project/-/(tree|blob)', 'app/views/projects/tree/show.html.haml', 'app/assets/javascripts/pages/projects/tree/show/index.js', '~/material_system/surfaces/Repository', 'mountRepositorySurface', '#js-material-repository-app'),
  wired('surface.secure', 'design/Secure.dc.html', '/:namespace/:project/-/dependencies', 'ee/app/views/projects/dependencies/index.html.haml', 'ee/app/assets/javascripts/pages/projects/dependencies/index/index.js', '~/material_system/surfaces/Secure', 'mountSecureSurface', '#js-material-secure'),
  wired('surface.security', 'design/Security.dc.html', '/:namespace/:project/-/security/dashboard', 'ee/app/views/projects/security/dashboard/index.html.haml', 'ee/app/assets/javascripts/pages/projects/security/dashboard/index/index.js', '~/material_system/surfaces/Security', 'mountSecurityDashboard', '#js-security-dashboard'),
  wired('surface.settings', 'design/Settings.dc.html', '/:namespace/:project/edit', 'app/views/projects/edit.html.haml', 'app/assets/javascripts/pages/projects/edit/index.js', '~/material_system/surfaces/Settings', 'mountProjectSettings', '#material-project-settings'),
  { ...wired('surface.shell-a', 'design/Shell A.dc.html', '/dashboard/projects', 'app/views/layouts/application.html.haml', 'app/assets/javascripts/entrypoints/super_sidebar.js', '~/material_system/mounts', 'mountAuthenticatedShell', '.m3-shell-topbar-host[data-material-shell]'), preference: { key: 'shellVariant', value: 'a' } },
  wired('surface.shell-b', 'design/Shell B.dc.html', null, 'app/views/layouts/application.html.haml', 'app/assets/javascripts/entrypoints/super_sidebar.js', '~/material_system/mounts', 'mountAuthenticatedShell', '.m3-shell-topbar-host[data-material-shell]'),
  wired('surface.sidebar', 'design/Sidebar.dc.html', null, 'app/views/layouts/_page.html.haml', 'app/assets/javascripts/entrypoints/super_sidebar.js', '~/material_system/mounts', 'mountSidebar', '.m3-shell-sidebar-host[data-material-shell]'),
  wired('surface.todos', 'design/Todos.dc.html', '/dashboard/todos', 'app/views/dashboard/todos/index.html.haml', 'app/assets/javascripts/pages/dashboard/todos/index/index.js', '~/material_system/surfaces/Todos', 'initTodosSurface', '#js-todos-app-root'),
].map(Object.freeze));

export const DESIGN_ROUTE_INTEGRATION_IDS = Object.freeze(['surface.admin', 'surface.agent-memory', 'surface.analyze', 'surface.build', 'surface.code', 'surface.command-palette', 'surface.deploy', 'surface.epics', 'surface.issues', 'surface.login', 'surface.manage', 'surface.merge-requests', 'surface.monitor', 'surface.operate', 'surface.pipelines', 'surface.plan', 'surface.regex-builder', 'surface.repository', 'surface.secure', 'surface.security', 'surface.settings', 'surface.shell-a', 'surface.shell-b', 'surface.sidebar', 'surface.todos']);

export function validateDesignRouteIntegrationContracts(contracts = DESIGN_ROUTE_INTEGRATION_CONTRACTS) {
  const statuses = new Set(['wired', 'embedded', 'preserved-host', 'source-registration', 'server-rendered', 'route-contract-pending']);
  const ids = new Set(); const errors = [];
  contracts.forEach((contract, index) => {
    if (!contract?.id) errors.push(`contracts[${index}].id is required`);
    if (ids.has(contract?.id)) errors.push(`duplicate route integration contract: ${contract.id}`);
    if (contract?.id) ids.add(contract.id);
    if (!contract?.reference) errors.push(`contracts[${index}].reference is required`);
    if (!statuses.has(contract?.status)) errors.push(`contracts[${index}].status is invalid`);
    if (!contract?.runtimeEvidence) errors.push(`contracts[${index}].runtimeEvidence is required`);
    if (['wired', 'embedded'].includes(contract?.status)) ['entrypoint', 'importSource', 'initializer', 'host'].forEach((field) => !contract[field] && errors.push(`contracts[${index}].${field} is required for source-wired routes`));
    if (!['wired', 'embedded'].includes(contract?.status) && !contract?.limitation) errors.push(`contracts[${index}].limitation is required for unresolved routes`);
  });
  DESIGN_ROUTE_INTEGRATION_IDS.forEach((id) => !ids.has(id) && errors.push(`missing route integration contract: ${id}`));
  if (contracts.length !== DESIGN_ROUTE_INTEGRATION_IDS.length) errors.push(`expected ${DESIGN_ROUTE_INTEGRATION_IDS.length} route integration contracts, received ${contracts.length}`);
  return { valid: errors.length === 0, errors };
}
