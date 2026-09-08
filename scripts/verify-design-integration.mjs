import fs from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import process from 'node:process';

const root = process.cwd();
const require = createRequire(import.meta.url);
const { parse } = require('@babel/core');
const read = (relative) => fs.readFileSync(path.join(root, relative), 'utf8');
const parseSource = (relative) => {
  const source = read(relative);
  const script = relative.endsWith('.vue') ? source.match(/<script[^>]*>([\s\S]*?)<\/script>/)?.[1] : source;
  return parse(script, { sourceType: 'module', filename: relative, configFile: false, babelrc: false });
};
const walk = (node, visit) => { if (!node || typeof node !== 'object') return; if (Array.isArray(node)) return node.forEach((item) => walk(item, visit)); visit(node); Object.entries(node).forEach(([key, item]) => !['loc', 'start', 'end'].includes(key) && walk(item, visit)); };
const importedBinding = (ast, source, name) => { let binding = null; walk(ast, (node) => { if (node.type === 'ImportDeclaration' && node.source.value === source) node.specifiers.forEach((item) => { if ((item.type === 'ImportSpecifier' && item.imported.name === name) || (item.type === 'ImportDefaultSpecifier' && item.local.name === name)) binding = item.local.name; }); }); return binding; };
const calls = (ast, binding) => { let found = false; walk(ast, (node) => { if (node.type === 'CallExpression' && node.callee?.type === 'Identifier' && node.callee.name === binding) found = true; }); return found; };
const ids = ['admin', 'agent-memory', 'analyze', 'build', 'code', 'command-palette', 'deploy', 'epics', 'issues', 'login', 'manage', 'merge-requests', 'monitor', 'operate', 'pipelines', 'plan', 'regex-builder', 'repository', 'secure', 'security', 'settings', 'shell-a', 'shell-b', 'sidebar', 'todos'];
const contract = read('app/assets/javascripts/material_system/surfaces/contracts.js');
const inventory = contract.slice(contract.indexOf('export const DESIGN_ROUTE_INTEGRATION_CONTRACTS'), contract.indexOf('export const DESIGN_ROUTE_INTEGRATION_IDS'));
const rows = [...inventory.matchAll(/'surface\.([^']+)'/g)].map((match) => match[1]);
if (new Set(rows).size !== 25 || ids.some((id) => !rows.includes(id))) throw new Error('The inventory must retain exactly the explicit 25 surface IDs');
if (!contract.includes("runtimeEvidence: notCaptured")) throw new Error('Source registration must not be presented as a runtime capture');

const routes = [
  ['app/assets/javascripts/pages/admin/dashboard/index.js', '~/material_system/surfaces/Admin', 'initAdminMaterial', 'app/views/admin/dashboard/index.html.haml', '#js-material-admin'],
  ['app/assets/javascripts/pages/agent_memory/index.js', '~/material_system/surfaces/AgentMemory', 'initAgentMemoryApp', 'app/views/agent_memory/index.html.haml', '#js-material-agent-memory'],
  ['app/assets/javascripts/pages/projects/cycle_analytics/show/index.js', '~/material_system/surfaces/Analyze', 'mountAnalyze', 'app/views/projects/cycle_analytics/show.html.haml', '#js-material-analyze'],
  ['app/assets/javascripts/pages/projects/jobs/index/index.js', '~/material_system/surfaces/Build', 'mountBuildSurface', 'app/views/projects/jobs/index.html.haml', '#js-material-build'],
  ['app/assets/javascripts/pages/projects/branches/index/index.js', '~/material_system/surfaces/Code', 'mountCodeSurface', 'app/views/projects/branches/index.html.haml', '#js-material-code-app'],
  ['app/assets/javascripts/pages/projects/tags/index/index.js', '~/material_system/surfaces/Code', 'mountCodeSurface', 'app/views/projects/tags/index.html.haml', '#js-material-code-app'],
  ['app/assets/javascripts/pages/projects/commits/show/index.js', '~/material_system/surfaces/Code', 'mountCodeSurface', 'app/views/projects/commits/show.html.haml', '#js-material-code-app'],
  ['app/assets/javascripts/pages/projects/releases/index/index.js', '~/material_system/surfaces/Deploy', 'mountDeploy', 'app/views/projects/releases/index.html.haml', '#js-material-deploy'],
  ['ee/app/assets/javascripts/pages/groups/epics/index/index.js', '~/material_system/surfaces/Epics', 'mountEpics', 'ee/app/views/groups/epics/index.html.haml', '#js-material-epics'],
  ['app/assets/javascripts/pages/projects/issues/material_index.js', '~/material_system/surfaces/Issues', 'initIssues', 'app/views/projects/issues/index.html.haml', 'material_issues'],
  ['app/assets/javascripts/pages/projects/manage.js', '~/material_system/surfaces/Manage', 'initManageMaterial', 'app/views/projects/manage.html.haml', '#js-material-manage'],
  ['app/assets/javascripts/pages/projects/merge_requests/material_index.js', '~/material_system/surfaces/MergeRequests', 'initMergeRequests', 'app/views/projects/merge_requests/index.html.haml', 'material_merge_requests'],
  ['app/assets/javascripts/pages/projects/alert_management/index/index.js', '~/material_system/surfaces/Monitor', 'mountMonitor', 'app/views/projects/alert_management/index.html.haml', '#js-material-monitor'],
  ['app/assets/javascripts/pages/projects/environments/index/index.js', '~/material_system/surfaces/Operate', 'mountOperate', 'app/views/projects/environments/index.html.haml', '#js-material-operate'],
  ['app/assets/javascripts/pages/projects/pipelines/index/index.js', '~/material_system/surfaces/Pipelines', 'mountPipelines', 'app/views/projects/pipelines/index.html.haml', '#js-material-pipelines'],
  ['app/assets/javascripts/pages/projects/milestones/index/index.js', '~/material_system/surfaces/Plan', 'mountPlan', 'app/views/projects/milestones/index.html.haml', 'material_plan_project_id'],
  ['app/assets/javascripts/pages/projects/tree/show/index.js', '~/material_system/surfaces/Repository', 'mountRepositorySurface', 'app/views/projects/tree/show.html.haml', '#js-material-repository-app'],
  ['app/assets/javascripts/pages/projects/blob/show/index.js', '~/material_system/surfaces/Repository', 'mountRepositorySurface', 'app/views/projects/blob/show.html.haml', '#js-material-repository-app'],
  ['ee/app/assets/javascripts/pages/projects/dependencies/index/index.js', '~/material_system/surfaces/Secure', 'mountSecureSurface', 'ee/app/views/projects/dependencies/index.html.haml', '#js-material-secure'],
  ['ee/app/assets/javascripts/pages/projects/security/dashboard/index/index.js', '~/material_system/surfaces/Security', 'mountSecurityDashboard', 'ee/app/views/projects/security/dashboard/index.html.haml', '#js-security-dashboard'],
  ['app/assets/javascripts/pages/dashboard/todos/index/index.js', '~/material_system/surfaces/Todos', 'initTodosSurface', 'app/views/dashboard/todos/index.html.haml', '#js-todos-app-root'],
  ['app/assets/javascripts/entrypoints/super_sidebar.js', '~/material_system/mounts', 'mountAuthenticatedShell', 'app/views/layouts/application.html.haml', 'm3-shell-topbar-host'],
  ['app/assets/javascripts/entrypoints/super_sidebar.js', '~/material_system/mounts', 'mountSidebar', 'app/views/layouts/_page.html.haml', 'm3-shell-sidebar-host'],
];
routes.forEach(([entrypoint, source, initializer, view, host]) => { const ast = parseSource(entrypoint); const binding = importedBinding(ast, source, initializer); if (!binding) throw new Error(`${entrypoint} lacks the exact ${initializer} import from ${source}`); if (!calls(ast, binding)) throw new Error(`${entrypoint} lacks the exact ${initializer} call`); if (!read(view).match(new RegExp(`^[^\\n]*${host.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\$&')}`, 'm'))) throw new Error(`${view} lacks ${host}`); });
const shell = parseSource('app/assets/javascripts/material_system/surfaces/ShellB/ShellB.vue');
if (!importedBinding(shell, '../CommandPalette/CommandPalette.vue', 'CommandPalette') || !importedBinding(shell, '../RegexBuilder/RegexBuilder.vue', 'RegexBuilder')) throw new Error('ShellB must retain its exact embedded command-palette and regex-builder imports');
const shellSource = read('app/assets/javascripts/material_system/surfaces/ShellB/ShellB.vue');
if (!shellSource.includes('<command-palette') || !shellSource.includes('<regex-builder')) throw new Error('ShellB must retain both embedded overlay hosts');
if (!read('app/views/devise/sessions/new.html.haml').includes("render 'devise/sessions/new_base'")) throw new Error('Login must remain Rails-authentication rendered');
['issues', 'merge_requests'].forEach((surface) => { if (!read(`app/assets/javascripts/pages/projects/${surface}/index/index.js`).includes("import '../material_index';")) throw new Error(`${surface} must retain its page-bootstrap edge`); });
process.stdout.write('Design-route source registration is valid; runtime capture evidence remains unverified.\n');
