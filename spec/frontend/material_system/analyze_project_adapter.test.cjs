const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const babel = require('@babel/core');
const vueCompiler = require('vue-template-compiler');
const { parse } = require('graphql');
const root = path.resolve(__dirname, '../../..');
const base = path.join(root, 'app/assets/javascripts/material_system/surfaces');
function load(name, component = false) {
  const filename = path.join(base, name);
  const source = fs.readFileSync(filename, 'utf8');
  const script = component ? vueCompiler.parseComponent(source).script.content : source;
  const { code } = babel.transformSync(script, { filename, babelrc: false, configFile: false, plugins: [require.resolve('@babel/plugin-transform-modules-commonjs')] });
  const module = { exports: {} };
  const localRequire = (specifier) => {
    if (specifier.endsWith('.vue') || specifier.endsWith('/settings')) return {};
    return load(path.relative(base, path.resolve(path.dirname(filename), specifier + '.js')));
  };
  new Function('require', 'module', 'exports', code)(localRequire, module, module.exports);
  return module.exports;
}
const data = load('Analyze/data.js');
const Analyze = load('Analyze/Analyze.vue', true).default;
const response = (payload) => ({ ok: true, status: 200, json: async () => payload });
const dates = { startDate: '2026-09-01', endDate: '2026-09-03' };
const endpoints = { projectPath: 'group/project', ref: 'feature/slash', graphql: '/api/graphql', valueStream: '/group/project/-/value_stream_analytics.json', permissions: { 'value-stream': true, 'ci-cd': true, repository: true, contributors: true, insights: true }, pipelineAggregates: true, insightsConfig: '/group/project/insights.json', insightsQuery: '/group/project/insights/query.json' };

test('dates use exact inclusive UTC days and reject invalid/reversed/oversized ranges', () => {
  assert.deepEqual(data.dateWindow(dates.startDate, dates.endDate), { ...dates, days: 3, from: '2026-09-01T00:00:00.000Z', to: '2026-09-03T23:59:59.999Z' });
  assert.throws(() => data.dateWindow('2026-02-30', '2026-03-01'), /valid calendar/);
  assert.throws(() => data.dateWindow('2026-09-03', '2026-09-01'), /1 and 180/);
  assert.throws(() => data.dateWindow('2025-01-01', '2026-01-01'), /1 and 180/);
});

test('duration and chart widths distinguish missing observations from real zeros', () => {
  assert.equal(data.formatDuration(null), 'Unavailable');
  assert.equal(data.formatDuration(false), 'Unavailable');
  assert.equal(data.formatDuration(0), '0 s');
  assert.equal(data.formatDuration(120), '2.00 min');
  assert.deepEqual(data.scaleBars([{ numericValue: null }, { numericValue: 0 }, { numericValue: 30 }, { numericValue: 60 }]).map((bar) => bar.percent), [null, 0, 50, 100]);
});

test('Value stream preserves native summary values and filters unauthorized stages', async () => {
  let requested;
  const adapter = data.createProjectAnalyzeAdapter({ endpoints, fetchImpl: async (url) => {
    requested = new URL(url, 'http://localhost');
    return response({ summary: [{ identifier: 'issues', title: 'New issues', value: '0' }], permissions: { issue: true, code: false, review: true }, stats: [{ name: 'issue', title: 'Issue', value: 3600 }, { name: 'code', title: 'Code', value: 7200 }, { name: 'review', title: 'Review', value: null }] });
  } });
  const report = await adapter.load('value-stream', dates);
  assert.equal(requested.searchParams.get('cycle_analytics[created_after]'), dates.startDate);
  assert.equal(requested.searchParams.get('cycle_analytics[created_before]'), dates.endDate);
  assert.equal(report.stats[0].value, '0');
  assert.deepEqual(report.bars.map((bar) => bar.label), ['Issue', 'Review']);
  assert.equal(report.bars[1].value, 'Unavailable');
});

test('Pipeline success rate uses successful plus failed and duration remains seconds', () => {
  const report = data.pipelineReport({ aggregate: { count: '100', successCount: '8', failedCount: '2', durationStatistics: { p50: 120 } }, timeSeries: [{ label: '2026-09-01', durationStatistics: { p50: 60 } }, { label: '2026-09-02', durationStatistics: { p50: 120 } }] });
  assert.equal(report.stats[0].value, '80.0%');
  assert.equal(report.stats[1].value, '2.00 min');
  assert.equal(report.stats[2].value, '100');
  assert.equal(report.stats[3].value, 'Unavailable');
  assert.deepEqual(report.bars.map((bar) => bar.percent), [50, 100]);
  assert.equal(data.pipelineReport({ aggregate: { count: 0, successCount: 0, failedCount: 0 } }).stats[0].value, 'Unavailable');
});

test('Pipeline requests carry the chosen timestamps rather than fixed legacy totals', async () => {
  let body;
  const adapter = data.createProjectAnalyzeAdapter({ endpoints, fetchImpl: async (_url, options) => { body = JSON.parse(options.body); return response({ data: { project: { pipelineAnalytics: { aggregate: { count: 0, successCount: 0, failedCount: 0 }, timeSeries: [] } } } }); } });
  await adapter.load('ci-cd', dates);
  assert.deepEqual(body.variables, { fullPath: 'group/project', from: '2026-09-01T00:00:00.000Z', to: '2026-09-03T23:59:59.999Z' });
  assert.equal(body.query, data.ANALYZE_PIPELINES_QUERY);
});

test('Permission and unsupported-aggregate states perform no unauthorized substitute reads', async () => {
  let calls = 0;
  const fetchImpl = async () => { calls += 1; throw new Error('Unexpected request'); };
  const noAccess = data.createProjectAnalyzeAdapter({ endpoints: { ...endpoints, permissions: {} }, fetchImpl });
  assert.match((await noAccess.load('repository', dates)).message, /current access/);
  const legacy = data.createProjectAnalyzeAdapter({ endpoints: { ...endpoints, pipelineAggregates: false }, fetchImpl });
  assert.match((await legacy.load('ci-cd', dates)).message, /fixed-period/);
  assert.equal(calls, 0);
});

test('Repository and contributor counts traverse all commit pages with explicit ref/date filters', async () => {
  const cursors = [];
  const adapter = data.createProjectAnalyzeAdapter({ endpoints, fetchImpl: async (url, options) => {
    assert.equal(url, '/api/graphql');
    const body = JSON.parse(options.body);
    if (body.query === data.ANALYZE_REPOSITORY_QUERY) return response({ data: { project: { repository: { empty: false, rootRef: 'main', branchCount: 3 }, statistics: null } } });
    assert.equal(body.variables.ref, 'feature/slash');
    assert.equal(body.variables.from, '2026-09-01T00:00:00.000Z');
    cursors.push(body.variables.after);
    return response({ data: { project: { repository: { commits: { nodes: [{ sha: body.variables.after ? 'b' : 'a', committedDate: '2026-09-02T10:00:00Z', authorName: 'Author', authorEmail: body.variables.after ? 'AUTHOR@example.test' : 'author@example.test' }], pageInfo: { hasNextPage: !body.variables.after, endCursor: 'second' } } } } } });
  } });
  const report = await adapter.load('contributors', dates);
  assert.deepEqual(cursors, [null, 'second']);
  assert.equal(report.stats[0].value, '1');
  assert.equal(report.stats[1].value, '2');
  assert.equal(report.bars[0].value, '2 commits');
  assert.equal(JSON.stringify(report).includes('@example.test'), false);
});

test('Repository snapshots do not invent missing coverage or storage values', () => {
  const report = data.repositoryReport({ repository: { branchCount: 0 }, statistics: null }, []);
  assert.equal(report.stats[0].value, '0');
  assert.equal(report.stats[1].value, 'Unavailable');
  assert.equal(report.stats[2].value, 'Unavailable');
  assert.equal(report.stats[3].value, '0');
  assert.deepEqual(report.bars, []);
});

test('Out-of-range commit observations fail instead of becoming misleading report totals', async () => {
  const adapter = data.createProjectAnalyzeAdapter({ endpoints, fetchImpl: async (_url, options) => {
    const body = JSON.parse(options.body);
    return response({ data: { project: { repository: body.query === data.ANALYZE_REPOSITORY_QUERY ? { empty: false, rootRef: 'main' } : { commits: { nodes: [{ sha: 'old', committedDate: '2020-01-01T00:00:00Z' }], pageInfo: { hasNextPage: false } } } } } });
  } });
  await assert.rejects(adapter.load('repository', dates), /observation range/);
});

test('Insights uses saved chart definitions, reported values and its actual configured window', async () => {
  const chart = { title: 'Open items by label', type: 'bar', query: { data_source: 'issuables', params: { issuable_type: 'issue', issuable_state: 'opened', collection_labels: ['backend', 'frontend'] } } };
  let sent;
  const adapter = data.createProjectAnalyzeAdapter({ endpoints, fetchImpl: async (url, options) => {
    if (url === endpoints.insightsConfig) return response({ issues: { title: 'Issues', charts: [chart] } });
    sent = JSON.parse(options.body);
    return response({ labels: ['backend', 'frontend'], datasets: [{ label: null, data: [4, 8] }] });
  } });
  const report = await adapter.load('insights', dates);
  assert.deepEqual(sent, chart);
  assert.match(report.caption, /no date constraint/);
  assert.equal(report.chartTitle, chart.title);
  assert.deepEqual(report.bars.map((bar) => bar.percent), [50, 100]);
  assert.equal(report.stats.some((stat) => /total issues/i.test(stat.label)), false);
  const dated = data.insightReport({ ...report, id: 'x', chart: { ...chart, query: { issuable_type: 'issue', group_by: 'week', period_limit: 8 } } }, { labels: [], datasets: [] }, []);
  assert.match(dated.caption, /8 week periods/);
});

test('Insights refuses mismatched series rather than substituting zero values', () => {
  assert.throws(() => data.insightReport({ id: 'x', chart: { query: { issuable_type: 'issue' } } }, { labels: ['one'], datasets: [{ data: [] }] }, []), /do not align/);
});

test('In-flight range edits do not relabel an already issued report request', async () => {
  let finish;
  const vm = { dataAdapter: { load: () => new Promise((resolve) => { finish = resolve; }) }, requestId: 0, activeTab: 'repository', ...dates, chartId: '' };
  const promise = Analyze.methods.loadReport.call(vm);
  vm.startDate = '2026-08-01';
  finish({ stats: [], bars: [] }); await promise;
  assert.match(vm.observedWindow, /2026-09-01/);
  assert.equal(vm.observedWindow.includes('2026-08-01'), false);
});

test('Queries parse and metadata selection has no broad REST Project request', () => {
  for (const query of [data.ANALYZE_REPOSITORY_QUERY, data.ANALYZE_COMMITS_QUERY, data.ANALYZE_PIPELINES_QUERY]) assert.ok(parse(query));
  const document = parse(data.ANALYZE_REPOSITORY_QUERY);
  const selected = [];
  const visit = (set, prefix = '') => { for (const field of set.selections) { assert.equal(field.kind, 'Field'); const name = prefix + field.name.value; if (field.selectionSet) visit(field.selectionSet, name + '.'); else selected.push(name); } };
  visit(document.definitions[0].selectionSet);
  assert.deepEqual(selected.sort(), ['project.repository.empty', 'project.repository.rootRef', 'project.repository.branchCount', 'project.statistics.repositorySize'].sort());
});

test('The project cycle analytics route mounts Analyze once and preserves topbar ownership', () => {
  assert.match(fs.readFileSync(path.join(root, 'app/views/projects/cycle_analytics/show.html.haml'), 'utf8'), /#js-material-analyze/);
  assert.match(fs.readFileSync(path.join(root, 'app/assets/javascripts/pages/projects/cycle_analytics/show/index.js'), 'utf8'), /mountAnalyze\(\)/);
  const source = fs.readFileSync(path.join(base, 'Analyze/Analyze.vue'), 'utf8');
  assert.match(source, /data-material-topbar-owner="surface.analyze"/);
  const component = vueCompiler.parseComponent(source);
  assert.deepEqual(vueCompiler.compile(component.template.content).errors, []);
  babel.transformSync(component.script.content, { filename: 'Analyze.vue', babelrc: false, configFile: false, plugins: [require.resolve('@babel/plugin-transform-modules-commonjs')] });
});
