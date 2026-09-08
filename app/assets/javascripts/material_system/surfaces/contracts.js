/** Hand-written stable inventory for the six shared-shell design contracts. */
export const SHARED_SHELL_CONTRACTS = Object.freeze([
  Object.freeze({ id: 'surface.shell-a', reference: 'design/Shell A.dc.html', mount: '.m3-shell-topbar-host', kind: 'authenticated-shell' }),
  Object.freeze({ id: 'surface.shell-b', reference: 'design/Shell B.dc.html', mount: '.m3-shell-topbar-host', kind: 'unauthenticated-shell' }),
  Object.freeze({ id: 'surface.sidebar', reference: 'design/Sidebar.dc.html', mount: '.m3-shell-sidebar-host', kind: 'sidebar' }),
  Object.freeze({ id: 'surface.command-palette', reference: 'design/Command Palette.dc.html', mount: '#material-command-palette-root', kind: 'overlay' }),
  Object.freeze({ id: 'surface.regex-builder', reference: 'design/Regex Builder.dc.html', mount: '[data-regex-builder-target]', kind: 'overlay' }),
  Object.freeze({ id: 'surface.analyze', reference: 'design/Analyze.dc.html', mount: '#js-explore-analytics-dashboards', kind: 'analytics' }),
]);

export function validateSharedShellContracts(contracts = SHARED_SHELL_CONTRACTS) {
  const errors = [];
  const ids = new Set();
  contracts.forEach((contract, index) => {
    if (!contract || !contract.id) errors.push(`contracts[${index}].id is required`);
    if (ids.has(contract?.id)) errors.push(`duplicate shared-shell contract: ${contract.id}`);
    if (contract?.id) ids.add(contract.id);
    if (!contract?.reference) errors.push(`contracts[${index}].reference is required`);
    if (!contract?.mount) errors.push(`contracts[${index}].mount is required`);
  });
  SHARED_SHELL_CONTRACTS.forEach(({ id }) => {
    if (!ids.has(id)) errors.push(`missing shared-shell contract: ${id}`);
  });
  return { valid: errors.length === 0, errors };
}

// This is deliberately hand-written. It is an integration inventory, not a
// discovery registry, so removing an unmounted design surface cannot make its
// route obligation disappear from the verification result.
export const DESIGN_ROUTE_INTEGRATION_CONTRACTS = Object.freeze([
  Object.freeze({ id: 'surface.admin', reference: 'design/Admin.dc.html', status: 'wired', route: '/admin', entrypoint: 'app/assets/javascripts/pages/admin/dashboard/index.js', initializer: 'initAdminMaterial', host: '#js-material-admin' }),
  Object.freeze({ id: 'surface.agent-memory', reference: 'design/Agent Memory.dc.html', status: 'wired', route: '/-/agent_memory', entrypoint: 'app/assets/javascripts/pages/agent_memory/index.js', initializer: 'initAgentMemoryApp', host: '#js-material-agent-memory' }),
  Object.freeze({ id: 'surface.analyze', reference: 'design/Analyze.dc.html', status: 'preserved-host', route: '/explore/analytics_dashboards', entrypoint: 'app/assets/javascripts/pages/explore/analytics_dashboards/index.js', initializer: 'initAnalyticsDashboards', host: '#js-explore-analytics-dashboards', limitation: 'The existing authenticated Apollo router owns this host. Analyze needs an adapter boundary before it can replace that application.' }),
  Object.freeze({ id: 'surface.build', reference: 'design/Build.dc.html', status: 'wired', route: '/:namespace/:project/-/jobs', entrypoint: 'app/assets/javascripts/pages/projects/jobs/index/index.js', initializer: 'mountBuildSurface', host: '#js-material-build' }),
  Object.freeze({ id: 'surface.code', reference: 'design/Code.dc.html', status: 'route-contract-pending', limitation: 'No page-specific mount host is registered for the standalone Code surface.' }),
  Object.freeze({ id: 'surface.command-palette', reference: 'design/Command Palette.dc.html', status: 'route-contract-pending', limitation: 'The layout exposes no dedicated overlay host for this component.' }),
  Object.freeze({ id: 'surface.deploy', reference: 'design/Deploy.dc.html', status: 'route-contract-pending', limitation: 'No Rails host supplies the required live endpoint metadata.' }),
  Object.freeze({ id: 'surface.epics', reference: 'design/Epics.dc.html', status: 'route-contract-pending', limitation: 'No page-specific host binds the Epics mount to server routes.' }),
  Object.freeze({ id: 'surface.issues', reference: 'design/Issues.dc.html', status: 'route-contract-pending', limitation: 'The existing Issues application has no compatibility host for this replacement surface.' }),
  Object.freeze({ id: 'surface.login', reference: 'design/Login.dc.html', status: 'route-contract-pending', limitation: 'The sign-in route currently consumes only the surface stylesheet, not the Vue component contract.' }),
  Object.freeze({ id: 'surface.manage', reference: 'design/Manage.dc.html', status: 'wired', route: '/:namespace/:project/-/manage', entrypoint: 'app/assets/javascripts/pages/projects/manage.js', initializer: 'initManageMaterial', host: '#js-material-manage' }),
  Object.freeze({ id: 'surface.merge-requests', reference: 'design/Merge Requests.dc.html', status: 'route-contract-pending', limitation: 'Existing merge request pages do not provide a compatible replacement mount host.' }),
  Object.freeze({ id: 'surface.monitor', reference: 'design/Monitor.dc.html', status: 'route-contract-pending', limitation: 'No Rails host supplies the required live endpoint metadata.' }),
  Object.freeze({ id: 'surface.operate', reference: 'design/Operate.dc.html', status: 'route-contract-pending', limitation: 'No Rails host supplies the required live endpoint metadata.' }),
  Object.freeze({ id: 'surface.pipelines', reference: 'design/Pipelines.dc.html', status: 'route-contract-pending', limitation: 'No page-specific mount host is registered for the standalone Pipelines surface.' }),
  Object.freeze({ id: 'surface.plan', reference: 'design/Plan.dc.html', status: 'route-contract-pending', limitation: 'No page-specific host binds the Plan mount to server routes.' }),
  Object.freeze({ id: 'surface.regex-builder', reference: 'design/Regex Builder.dc.html', status: 'route-contract-pending', limitation: 'No independent route host exists because this is an overlay component.' }),
  Object.freeze({ id: 'surface.repository', reference: 'design/Repository.dc.html', status: 'wired', route: '/:namespace/:project/-/(tree|blob|commits)', entrypoint: 'app/assets/javascripts/repository/index.js', initializer: 'mountRepositorySurface', host: '#js-material-repository-app' }),
  Object.freeze({ id: 'surface.secure', reference: 'design/Secure.dc.html', status: 'route-contract-pending', limitation: 'No Rails host supplies the required live endpoint metadata.' }),
  Object.freeze({ id: 'surface.security', reference: 'design/Security.dc.html', status: 'route-contract-pending', limitation: 'No Rails host supplies the required live endpoint metadata.' }),
  Object.freeze({ id: 'surface.settings', reference: 'design/Settings.dc.html', status: 'route-contract-pending', limitation: 'No page-specific mount host is registered for the standalone Settings surface.' }),
  Object.freeze({ id: 'surface.shell-a', reference: 'design/Shell A.dc.html', status: 'route-contract-pending', limitation: 'The authenticated layout exposes a host, but no production bootstrap invokes the Material shell mount.' }),
  Object.freeze({ id: 'surface.shell-b', reference: 'design/Shell B.dc.html', status: 'route-contract-pending', limitation: 'No authenticated production route selects this standalone shell contract.' }),
  Object.freeze({ id: 'surface.sidebar', reference: 'design/Sidebar.dc.html', status: 'route-contract-pending', limitation: 'The authenticated layout exposes a host, but no production bootstrap invokes the Material sidebar mount.' }),
  Object.freeze({ id: 'surface.todos', reference: 'design/Todos.dc.html', status: 'wired', route: '/dashboard/todos', entrypoint: 'app/assets/javascripts/pages/dashboard/todos/index/index.js', initializer: 'initTodosSurface', host: '#js-todos-app-root' }),
]);

// Keep this independent from the rows above. A registry-derived ID list would
// silently agree with a deleted row and turn a completeness check into a
// discovery check.
export const DESIGN_ROUTE_INTEGRATION_IDS = Object.freeze([
  'surface.admin',
  'surface.agent-memory',
  'surface.analyze',
  'surface.build',
  'surface.code',
  'surface.command-palette',
  'surface.deploy',
  'surface.epics',
  'surface.issues',
  'surface.login',
  'surface.manage',
  'surface.merge-requests',
  'surface.monitor',
  'surface.operate',
  'surface.pipelines',
  'surface.plan',
  'surface.regex-builder',
  'surface.repository',
  'surface.secure',
  'surface.security',
  'surface.settings',
  'surface.shell-a',
  'surface.shell-b',
  'surface.sidebar',
  'surface.todos',
]);

export function validateDesignRouteIntegrationContracts(contracts = DESIGN_ROUTE_INTEGRATION_CONTRACTS) {
  const errors = [];
  const ids = new Set();
  const statuses = new Set(['wired', 'preserved-host', 'route-contract-pending']);

  contracts.forEach((contract, index) => {
    if (!contract?.id) errors.push(`contracts[${index}].id is required`);
    if (ids.has(contract?.id)) errors.push(`duplicate route integration contract: ${contract.id}`);
    if (contract?.id) ids.add(contract.id);
    if (!contract?.reference) errors.push(`contracts[${index}].reference is required`);
    if (!statuses.has(contract?.status)) errors.push(`contracts[${index}].status is invalid`);
    if (contract?.status === 'wired') {
      ['route', 'entrypoint', 'initializer', 'host'].forEach((field) => {
        if (!contract[field]) errors.push(`contracts[${index}].${field} is required for wired routes`);
      });
    }
    if (contract?.status !== 'wired' && !contract?.limitation) {
      errors.push(`contracts[${index}].limitation is required for unresolved routes`);
    }
  });

  DESIGN_ROUTE_INTEGRATION_IDS.forEach((id) => {
    if (!ids.has(id)) errors.push(`missing route integration contract: ${id}`);
  });
  if (contracts.length !== DESIGN_ROUTE_INTEGRATION_IDS.length) {
    errors.push(`expected ${DESIGN_ROUTE_INTEGRATION_IDS.length} route integration contracts, received ${contracts.length}`);
  }

  return { valid: errors.length === 0, errors };
}
