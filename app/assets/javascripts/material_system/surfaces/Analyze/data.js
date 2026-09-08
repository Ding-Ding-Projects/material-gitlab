import { operationsRequest, operationsGraphql, operationsConnection } from '../Deploy/transport';

export const ANALYZE_TABS = Object.freeze([
  { id: 'value-stream', label: 'Value stream' },
  { id: 'ci-cd', label: 'CI/CD' },
  { id: 'repository', label: 'Repository' },
  { id: 'contributors', label: 'Contributors' },
  { id: 'insights', label: 'Insights' },
]);

export const ANALYZE_REPOSITORY_QUERY = `query MaterialAnalyzeRepository($fullPath: ID!) {
  project(fullPath: $fullPath) { repository { empty rootRef branchCount } statistics { repositorySize } }
}`;
export const ANALYZE_COMMITS_QUERY = `query MaterialAnalyzeCommits($fullPath: ID!, $ref: String!, $from: Time!, $to: Time!, $after: String) {
  project(fullPath: $fullPath) { repository { commits(ref: $ref, committedAfter: $from, committedBefore: $to, first: 100, after: $after) {
    nodes { sha committedDate authorName authorEmail }
    pageInfo { hasNextPage endCursor }
  } } }
}`;
export const ANALYZE_PIPELINES_QUERY = `query MaterialAnalyzePipelines($fullPath: ID!, $from: Time!, $to: Time!) {
  project(fullPath: $fullPath) { pipelineAnalytics(fromTime: $from, toTime: $to) {
    aggregate { count successCount: count(status: SUCCESS) failedCount: count(status: FAILED) durationStatistics { p50 } }
    timeSeries(period: DAY) { label durationStatistics { p50 } }
  } }
}`;

export function dateWindow(startDate, endDate) {
  const parseDate = (value) => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value || '')) throw new Error('Choose valid start and end dates.');
    const date = new Date(value + 'T00:00:00.000Z');
    if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== value) throw new Error('Choose valid calendar dates.');
    return date;
  };
  const start = parseDate(startDate); const end = parseDate(endDate);
  const days = Math.round((end - start) / 86400000) + 1;
  if (days < 1 || days > 180) throw new Error('Choose a range between 1 and 180 inclusive days.');
  return { startDate, endDate, days, from: start.toISOString(), to: new Date(end.getTime() + 86400000 - 1).toISOString() };
}

const numeric = (value) => {
  if (typeof value !== 'number' && (typeof value !== 'string' || !/^\d+(?:\.\d+)?$/.test(value))) return null;
  return Number.isFinite(Number(value)) && Number(value) >= 0 ? Number(value) : null;
};
const count = (value) => { const result = numeric(value); return Number.isSafeInteger(result) ? result : null; };
const formatCount = (value) => count(value) === null ? 'Unavailable' : count(value).toLocaleString();
export function formatDuration(value) {
  const seconds = numeric(value);
  if (seconds === null) return 'Unavailable';
  if (seconds >= 86400) return `${(seconds / 86400).toFixed(2)} d`;
  if (seconds >= 3600) return `${(seconds / 3600).toFixed(2)} h`;
  if (seconds >= 60) return `${(seconds / 60).toFixed(2)} min`;
  return `${Number(seconds.toFixed(2))} s`;
}
const stat = (label, value, detail = '') => ({ label, value: value === null || value === undefined || value === '' ? 'Unavailable' : String(value), detail });
export function scaleBars(rows) {
  const observed = rows.map((row) => numeric(row.numericValue)).filter((value) => value !== null);
  const maximum = observed.length ? Math.max(...observed) : null;
  return rows.map((row) => ({ ...row, percent: numeric(row.numericValue) === null ? null : maximum > 0 ? (numeric(row.numericValue) / maximum) * 100 : 0 }));
}
const unavailable = (message) => ({ stats: [], bars: [], chartTitle: 'Report unavailable', message });

export function valueStreamReport(payload) {
  if (!Array.isArray(payload?.summary) || !Array.isArray(payload?.stats) || !payload.permissions) throw new Error('The value stream service returned an invalid report.');
  const stages = payload.stats.filter((stage) => payload.permissions[stage.name] === true);
  return {
    stats: payload.summary.map((item) => stat(item.title || item.identifier, item.value, item.unit || 'Selected date range')),
    chartTitle: 'Time in stage (median)',
    caption: 'Default project value stream. Native stage medians are seconds, displayed with explicit duration units. Width is relative to the largest observed median.',
    bars: scaleBars(stages.map((stage) => ({ label: stage.title || stage.name, numericValue: numeric(stage.value), value: formatDuration(stage.value), detail: stage.legend || stage.description || '' }))),
  };
}

export function pipelineReport(analytics) {
  const aggregate = analytics?.aggregate;
  if (!aggregate) return unavailable('Date-bounded pipeline aggregates are unavailable. Open the full CI/CD report for the analytics supported by this instance.');
  const success = count(aggregate.successCount); const failed = count(aggregate.failedCount);
  const denominator = success !== null && failed !== null ? success + failed : null;
  return {
    stats: [stat('Success rate', denominator > 0 ? `${((success / denominator) * 100).toFixed(1)}%` : null, 'Successful / (successful + failed); canceled and skipped excluded'), stat('Median pipeline duration', formatDuration(aggregate.durationStatistics?.p50)), stat('Pipelines in period', formatCount(aggregate.count)), stat('Flaky tests', null, 'Not supplied by this aggregate')],
    chartTitle: 'Pipeline duration by UTC day (median)',
    caption: 'Durations are measured in seconds. Width is relative to the largest observed daily median; no trend baseline is inferred.',
    bars: scaleBars((analytics.timeSeries || []).map((period) => ({ label: period.label, numericValue: numeric(period.durationStatistics?.p50), value: formatDuration(period.durationStatistics?.p50) }))),
  };
}

function weekStart(value) {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) throw new Error('A commit is missing its observation time.');
  date.setUTCHours(0, 0, 0, 0);
  date.setUTCDate(date.getUTCDate() - ((date.getUTCDay() + 6) % 7));
  return date.toISOString().slice(0, 10);
}
export function repositoryReport(metadata, commits) {
  const weeks = new Map();
  for (const commit of commits) { const week = weekStart(commit.committedDate); weeks.set(week, (weeks.get(week) || 0) + 1); }
  const size = numeric(metadata.statistics?.repositorySize);
  return {
    stats: [stat('Commits in period', formatCount(commits.length)), stat('Repository size', size === null ? null : `${(size / 1048576).toFixed(2)} MiB`, 'Current authorized snapshot; 1 MiB = 1,048,576 bytes'), stat('Test coverage', null, 'Open the full repository report for coverage results'), stat('Current branches', formatCount(metadata.repository?.branchCount), 'Current snapshot, not active-branch classification')],
    chartTitle: 'Observed commits by UTC week',
    caption: 'Commits on the selected ref, including merge commits. Week labels are Mondays; the first and last weeks may be partial. Empty weeks are omitted.',
    bars: scaleBars([...weeks].sort(([a], [b]) => a.localeCompare(b)).map(([label, value]) => ({ label: `Week of ${label}`, numericValue: value, value: `${value} commits` }))),
  };
}
export function contributorsReport(commits) {
  const authors = new Map(); let unattributed = 0;
  for (const commit of commits) {
    const identity = commit.authorEmail ? commit.authorEmail.toLowerCase() : commit.authorName;
    if (!identity) { unattributed += 1; continue; }
    const author = authors.get(identity) || { label: commit.authorName || 'Unnamed author', numericValue: 0 };
    author.numericValue += 1; authors.set(identity, author);
  }
  return {
    stats: [stat('Distinct author identities', formatCount(authors.size), 'Commit authors, not a count of GitLab accounts'), stat('Commits in period', formatCount(commits.length)), stat('Median review time', null, 'Not supplied by commit history'), stat('Unattributed commits', formatCount(unattributed))],
    chartTitle: 'Commits by author in the selected period',
    caption: 'All pages of commit observations on the selected ref, including merges. Commit identity is used for grouping; email addresses are not displayed.',
    bars: scaleBars([...authors.values()].sort((a, b) => b.numericValue - a.numericValue).map((author) => ({ ...author, value: `${author.numericValue} commits` }))),
  };
}

export function configuredInsights(config) {
  if (!config || typeof config !== 'object' || Array.isArray(config)) throw new Error('The Insights configuration was not an object.');
  return Object.entries(config).flatMap(([pageId, page]) => (Array.isArray(page.charts) ? page.charts : []).map((chart, index) => ({ id: `${pageId}:${index}`, label: `${page.title || pageId}: ${chart.title || 'Untitled chart'}`, chart })));
}
export function insightReport(option, payload, choices) {
  const chart = option.chart;
  const query = chart.query?.params || chart.query || {};
  const source = chart.query?.data_source || 'issuables';
  const issuableType = String(query.issuable_type || '').replace(/s$/, '');
  if (source !== 'issuables' || !['issue', 'merge_request'].includes(issuableType)) return { ...unavailable('This configured chart uses a metric with specialized units. Open its full Insights report.'), choices, selectedChart: option.id };
  if (!Array.isArray(payload?.labels) || !Array.isArray(payload?.datasets)) throw new Error('The Insights chart response was invalid.');
  const rows = payload.datasets.flatMap((series, seriesIndex) => {
    if (!Array.isArray(series.data) || series.data.length !== payload.labels.length) throw new Error('Insights labels and series do not align.');
    return payload.labels.map((label, index) => ({ id: `${seriesIndex}:${index}`, label: [series.label, label].filter(Boolean).join(' / '), numericValue: numeric(series.data[index]), value: numeric(series.data[index]) === null ? 'Unavailable' : `${series.data[index]} ${issuableType === 'issue' ? 'issues' : 'merge requests'}` }));
  });
  const period = String(query.group_by || 'day').replace(/s$/, '');
  const defaultLimit = period === 'day' ? 30 : 12;
  const windowDescription = query.group_by ? `${query.period_limit ?? defaultLimit} ${period} periods relative to server time` : 'no date constraint; all items matching the saved query';
  return {
    choices, selectedChart: option.id, stats: [stat('Configured chart', chart.title || option.label), stat('Reported series', payload.datasets.length), stat('Reported categories', payload.labels.length)],
    chartTitle: chart.title || option.label,
    caption: `Saved Insights configuration: ${windowDescription}. The date controls do not apply. Series are displayed independently; overlapping labels are not summed as a unique issue total.`,
    bars: scaleBars(rows),
  };
}

export function createProjectAnalyzeAdapter({ endpoints, fetchImpl } = {}) {
  if (!endpoints?.projectPath) throw new Error('Analyze requires the current project identity.');
  const options = { fetchImpl };
  const fetchRepository = async (range) => {
    const data = await operationsGraphql(endpoints.graphql, ANALYZE_REPOSITORY_QUERY, { fullPath: endpoints.projectPath }, options);
    if (!data.project?.repository) throw new Error('Repository analytics are not available for this project.');
    if (data.project.repository.empty) return { metadata: data.project, commits: [] };
    const ref = endpoints.ref || data.project.repository.rootRef;
    if (!ref) throw new Error('Choose a valid repository ref in the full report.');
    const commits = await operationsConnection(endpoints.graphql, ANALYZE_COMMITS_QUERY, { fullPath: endpoints.projectPath, ref, from: range.from, to: range.to }, (result) => result.project?.repository?.commits, options);
    const observed = new Set();
    for (const commit of commits) {
      const date = new Date(commit.committedDate).getTime();
      if (!commit.sha || observed.has(commit.sha) || !Number.isFinite(date) || date < Date.parse(range.from) || date > Date.parse(range.to)) throw new Error('The commit response did not match the requested observation range.');
      observed.add(commit.sha);
    }
    return { metadata: data.project, commits };
  };
  return {
    tabs: ANALYZE_TABS,
    async load(tab, { startDate, endDate, chartId } = {}) {
      if (!endpoints.permissions?.[tab]) return unavailable('This report is unavailable for this project or your current access.');
      if (tab === 'insights') {
        const { payload: config } = await operationsRequest(endpoints.insightsConfig, options);
        const choices = configuredInsights(config);
        if (!choices.length) return unavailable('No configured Insights charts are available. Open Insights to review the project configuration.');
        const option = choices.find((item) => item.id === chartId) || choices[0];
        const query = option.chart.query?.params || option.chart.query || {};
        const source = option.chart.query?.data_source || 'issuables';
        const selections = choices.map(({ id, label }) => ({ id, label }));
        if (source !== 'issuables' || !['issue', 'merge_request'].includes(String(query.issuable_type || '').replace(/s$/, ''))) return insightReport(option, null, selections);
        const { payload } = await operationsRequest(endpoints.insightsQuery, { ...options, method: 'POST', body: option.chart });
        return insightReport(option, payload, selections);
      }
      const range = dateWindow(startDate, endDate);
      if (tab === 'value-stream') {
        const url = new URL(endpoints.valueStream, globalThis.location?.origin || 'http://localhost');
        url.searchParams.set('cycle_analytics[created_after]', range.startDate);
        url.searchParams.set('cycle_analytics[created_before]', range.endDate);
        const { payload } = await operationsRequest(url.pathname + url.search, options);
        return valueStreamReport(payload);
      }
      if (tab === 'ci-cd') {
        if (!endpoints.pipelineAggregates) return unavailable('This instance does not provide date-bounded pipeline aggregates. The full CI/CD report retains its supported fixed-period analytics.');
        const data = await operationsGraphql(endpoints.graphql, ANALYZE_PIPELINES_QUERY, { fullPath: endpoints.projectPath, from: range.from, to: range.to }, options);
        return pipelineReport(data.project?.pipelineAnalytics);
      }
      if (tab === 'repository' || tab === 'contributors') {
        const { metadata, commits } = await fetchRepository(range);
        return tab === 'repository' ? repositoryReport(metadata, commits) : contributorsReport(commits);
      }
      throw new Error('Unknown project analytics tab.');
    },
  };
}
