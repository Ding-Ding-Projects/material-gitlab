const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const babel = require('@babel/core');
const vueCompiler = require('vue-template-compiler');
const { parse } = require('graphql');
const root = path.resolve(__dirname, '../../..');
const surface = path.join(root, 'app/assets/javascripts/material_system/surfaces');
const cache = new Map();
function load(relative) {
  const filename = path.resolve(surface, relative);
  if (cache.has(filename)) return cache.get(filename);
  const module = { exports: {} };
  cache.set(filename, module.exports);
  const { code } = babel.transformSync(fs.readFileSync(filename, 'utf8'), {
    filename, babelrc: false, configFile: false,
    plugins: [require.resolve('@babel/plugin-transform-modules-commonjs')],
  });
  const localRequire = (name) => name.startsWith('.') ? load(path.relative(surface, path.resolve(path.dirname(filename), name + (path.extname(name) ? '' : '.js')))) : require(name);
  new Function('require', 'module', 'exports', code)(localRequire, module, module.exports);
  cache.set(filename, module.exports);
  return module.exports;
}
const response = (payload, headers = {}, status = 200) => ({ ok: status < 400, status, json: async () => payload, headers: { get: (name) => headers[name] || null } });
const deploy = load('Deploy/data.js');
const transport = load('Deploy/transport.js');
const operate = load('Operate/data.js');
const monitor = load('Monitor/data.js');
const secure = load('Secure/data.js');
const security = load('Security/data.js');

test('REST pagination collects every page and rejects an off-instance next link', async () => {
  const calls = [];
  const rows = await transport.operationsCollection('/api/v4/projects/1/releases?per_page=100', { fetchImpl: async (url) => {
    calls.push(url); return calls.length === 1 ? response([{ tag_name: 'v1' }], { 'X-Next-Page': '2' }) : response([{ tag_name: 'v2' }]);
  } });
  assert.equal(rows.length, 2); assert.match(calls[1], /page=2/);
  await assert.rejects(transport.operationsCollection('/api/list', { fetchImpl: async () => response([], { Link: '<https://elsewhere.example/api>; rel="next"' }) }), /stay on this GitLab/);
});

test('feature flags use the native name identifier, active field, and session CSRF header', async () => {
  global.document = { querySelector: () => ({ content: 'test-csrf' }) };
  let request;
  const [flag] = deploy.normalizeDeployCollection('featureFlags', [{ id: 5, name: 'flag/name', active: false }]);
  await deploy.updateFeatureFlag({ endpoints: { updateFeatureFlag: '/api/v4/projects/1/feature_flags/:id' }, id: flag.id, enabled: true, fetchImpl: async (url, options) => { request = { url, ...options }; return response({ active: true }); } });
  assert.equal(request.url, '/api/v4/projects/1/feature_flags/flag%2Fname');
  assert.deepEqual(JSON.parse(request.body), { active: true });
  assert.equal(request.headers['X-CSRF-Token'], 'test-csrf');
  delete global.document;
});

test('package deletion cannot target the collection endpoint', async () => {
  let target;
  await deploy.deleteDeployItem({ endpoints: { packages: '/api/packages', deletePackage: '/api/packages/:id' }, kind: 'packages', id: '17', fetchImpl: async (url, options) => { target = { url, method: options.method }; return response(null, {}, 204); } });
  assert.deepEqual(target, { url: '/api/packages/17', method: 'DELETE' });
  await assert.rejects(async () => deploy.deleteDeployItem({ endpoints: { packages: '/api/packages' }, kind: 'packages', id: '17' }), /Missing live endpoint/);
});

test('environment Rails wrapper preserves permission-controlled stop links and both scopes', async () => {
  const data = await operate.fetchOperateData({ endpoints: { environments: '/environments.json?scope=active', stoppedEnvironments: '/environments.json?scope=stopped' }, fetchImpl: async (url) => response({ environments: [{ id: url.includes('active') ? 1 : 2, name: 'production', state: url.includes('active') ? 'available' : 'stopped', can_stop: url.includes('active'), stop_path: '/environments/1/stop', environment_path: '/environments/1' }] }) });
  assert.equal(data.environments.length, 2); assert.equal(data.environments[0].stopPath, '/environments/1/stop'); assert.equal(data.environments[1].stopPath, null);
});

test('Terraform lock operation propagates native GraphQL errors and preserves global IDs', async () => {
  let variables;
  await assert.rejects(operate.changeStateLock({ graphql: '/api/graphql', terraformAdmin: true }, { id: 'gid://gitlab/Terraform::State/2', status: 'locked' }, { fetchImpl: async (_url, options) => {
    const body = JSON.parse(options.body); variables = body.variables; assert.match(body.query, /terraformStateUnlock/); return response({ data: { terraformStateUnlock: { errors: ['State is unavailable'] } } });
  } }), /State is unavailable/);
  assert.equal(variables.id, 'gid://gitlab/Terraform::State/2');
});

test('GraphQL connections follow cursors and reject null authorization results', async () => {
  const cursors = [];
  const items = await transport.operationsConnection('/api/graphql', 'query Test { project { id } }', {}, (data) => data.project.states, { fetchImpl: async (_url, options) => {
    cursors.push(JSON.parse(options.body).variables.after); return response({ data: { project: { states: { nodes: [{ id: String(cursors.length) }], pageInfo: { hasNextPage: cursors.length === 1, endCursor: 'next' } } } } });
  } });
  assert.deepEqual(cursors, [null, 'next']); assert.equal(items.length, 2);
  await assert.rejects(transport.operationsConnection('/api/graphql', '', {}, (data) => data.project?.states, { fetchImpl: async () => response({ data: { project: null } }) }), /unavailable or not authorized/);
});

test('dependency REST serializer fields normalize without invented identity or location', async () => {
  const rows = await secure.fetchDependencies({ endpoint: '/dependencies.json', fetchImpl: async () => response({ dependencies: [{ occurrence_id: 41, name: 'rails', version: '7.2', packager: 'bundler', location: { path: 'Gemfile.lock', blob_path: '/group/project/-/blob/main/Gemfile.lock' }, licenses: [{ name: 'MIT' }] }] }) });
  assert.equal(rows[0].id, '41'); assert.equal(rows[0].name, 'rails 7.2'); assert.equal(rows[0].packageManager, 'bundler'); assert.equal(rows[0].origin, 'Gemfile.lock');
});

test('authorized audit JSON adapter follows its explicit next_page field', async () => {
  let count = 0;
  const rows = await secure.fetchAuditEvents({ endpoint: '/audit_events.json', fetchImpl: async () => response({ events: [{ id: ++count, action: 'updated settings', author: { name: 'Operator' }, date: '2026-09-08' }], next_page: count === 1 ? 2 : null }) });
  assert.equal(rows.length, 2); assert.equal(rows[0].name, 'updated settings');
});

test('scan cancellation uses pipelineCancel rather than fabricating a ready state', async () => {
  let body;
  await secure.updateScanStatus('gid://gitlab/Ci::Pipeline/8', 'ready', { endpoint: '/api/graphql', fetchImpl: async (_url, options) => { body = JSON.parse(options.body); return response({ data: { pipelineCancel: { errors: [] } } }); } });
  assert.match(body.query, /pipelineCancel/); assert.equal(body.variables.id, 'gid://gitlab/Ci::Pipeline/8');
});

test('vulnerability GraphQL enums normalize and rejected mutations remain rejected', async () => {
  const rows = await security.fetchVulnerabilities({ endpoint: '/api/graphql', projectPath: 'group/project', fetchImpl: async () => response({ data: { project: { vulnerabilities: { nodes: [{ id: 'gid://gitlab/Vulnerability/2', title: 'Finding', severity: 'HIGH', state: 'CONFIRMED', vulnerabilityPath: '/group/project/-/security/vulnerabilities/2' }], pageInfo: { hasNextPage: false } } } } }) });
  assert.equal(rows[0].status, 'Confirmed'); assert.equal(rows[0].severity, 'high'); assert.equal(rows[0].href, '/group/project/-/security/vulnerabilities/2');
  await assert.rejects(security.updateVulnerabilityStatus({ endpoint: '/api/graphql', id: rows[0].id, status: 'Resolved', fetchImpl: async () => response({ data: { vulnerabilityResolve: { vulnerability: null, errors: ['Not permitted'] } } }) }), /Not permitted/);
});

test('monitor alerts use native enum transitions and retain the alert detail route', async () => {
  const endpoints = { alerts: '/api/graphql', updateAlert: '/api/graphql', projectPath: 'group/project', projectUrl: '/group/project' };
  const rows = await monitor.fetchMonitorTab('alerts', { endpoints, fetchImpl: async () => response({ data: { project: { alertManagementAlerts: { nodes: [{ id: 'gid://gitlab/AlertManagement::Alert/5', iid: '3', title: 'CPU load', status: 'TRIGGERED' }], pageInfo: { hasNextPage: false } } } } }) });
  assert.equal(rows[0].href, '/group/project/-/alert_management/3/details');
  await monitor.changeMonitorStatus(rows[0], endpoints, { fetchImpl: async (_url, options) => { const body = JSON.parse(options.body); assert.equal(body.variables.status, 'ACKNOWLEDGED'); assert.equal(body.variables.iid, '3'); return response({ data: { updateAlertStatus: { errors: [], alert: { id: rows[0].id, status: 'ACKNOWLEDGED' } } } }); } });
});

test('all production GraphQL documents parse', () => {
  for (const query of [operate.OPERATE_STATE_QUERY, operate.OPERATE_AGENTS_QUERY, monitor.MONITOR_ALERTS_QUERY, monitor.MONITOR_ONCALL_QUERY, secure.SECURE_POLICIES_QUERY, secure.SECURE_SCANS_QUERY, security.VULNERABILITIES_QUERY]) assert.ok(parse(query));
});

test('all five surface scripts and templates compile', () => {
  for (const name of ['Deploy', 'Operate', 'Monitor', 'Secure', 'Security']) {
    const filenames = fs.readdirSync(path.join(surface, name), { recursive: true }).filter((file) => file.endsWith('.vue')).map((file) => path.join(surface, name, file));
    for (const filename of filenames) {
    const descriptor = vueCompiler.parseComponent(fs.readFileSync(filename, 'utf8'));
    const compiled = vueCompiler.compile(descriptor.template.content);
    assert.deepEqual(compiled.errors, [], name + ' template');
    babel.transformSync(descriptor.script.content, { filename, babelrc: false, configFile: false, plugins: [require.resolve('@babel/plugin-transform-modules-commonjs')] });
    }
  }
});
