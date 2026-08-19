/**
 * View model for the Pipelines surface, ported from Pipelines.dc.html's DCLogic state
 * and renderVals(). Kept as plain data + pure functions so a real API layer (GraphQL or
 * REST `/pipelines` + `/pipelines/:id`) can replace `createInitialPipelines()` without
 * touching any component. Status keys mirror CI job detailed_status values; origin values
 * mirror ci/pipelines_page/constants.js (push, merge request, schedule, api, web).
 */

// One entry per CI status this surface renders. `icon` is a Material Symbols name;
// `fg`/`bg` are CSS custom-property references so they follow the active theme.
const STATUS_META = {
  success: { icon: 'check_circle', fg: 'var(--good)', bg: 'var(--goodc)' },
  running: { icon: 'sync', fg: 'var(--warn)', bg: 'var(--warnc)' },
  failed: { icon: 'cancel', fg: 'var(--err)', bg: 'var(--errc)' },
  canceled: { icon: 'block', fg: 'var(--onsurfv)', bg: 'var(--surfch)' },
  skipped: { icon: 'skip_next', fg: 'var(--onsurfv)', bg: 'var(--surfch)' },
  manual: { icon: 'play_circle', fg: 'var(--onprimc)', bg: 'var(--primc)' },
  created: { icon: 'pending', fg: 'var(--onsurfv)', bg: 'var(--surfch)' },
};
const FALLBACK_STATUS_META = { icon: 'help', fg: 'var(--onsurfv)', bg: 'var(--surfch)' };

export function statusMeta(status) {
  return STATUS_META[status] || FALLBACK_STATUS_META;
}

export const FILTER_DEFINITIONS = Object.freeze([
  { key: 'failed', label: 'Failed' },
  { key: 'running', label: 'Running' },
]);

/**
 * A stage's dot in the list row shows its single worst job. Precedence matches the
 * design exactly: any failed job wins, otherwise any running job wins, otherwise the
 * status carries through — starting from an optimistic 'success' accumulator.
 */
export function worstJobStatus(jobs) {
  return jobs.reduce((acc, job) => {
    if (acc === 'failed' || job.status === 'failed') return 'failed';
    if (acc === 'running' || job.status === 'running') return 'running';
    return job.status;
  }, 'success');
}

function baseLogLines(job) {
  return [
    { text: `$ gitlab-runner exec ${job.name}`, color: '#938f99' },
    { text: 'Preparing environment… done in 00:02', color: '#cac4d0' },
    { text: 'Restoring cache node_modules-a41f9c2e… hit', color: '#cac4d0' },
  ];
}

/** Builds the job-log panel lines. The log viewer's own chrome is intentionally a fixed
 * dark terminal palette regardless of the active app theme, matching the design. */
export function buildJobLog(job) {
  const base = baseLogLines(job);
  if (job.status === 'failed') {
    return [
      ...base,
      { text: 'FAIL src/boards/board_column.spec.js', color: '#f2b8b5' },
      { text: '  ● renders empty state — snapshot mismatch', color: '#f2b8b5' },
      { text: 'Tests: 1 failed, 214 passed', color: '#f2b8b5' },
      { text: 'ERROR: Job failed: exit code 1', color: '#f2b8b5' },
    ];
  }
  if (job.status === 'running') {
    return [
      ...base,
      { text: `RUN jest --shard ${job.name.slice(-3)} — 148/220 suites`, color: '#e2c46d' },
      { text: '▌ running…', color: '#e2c46d' },
    ];
  }
  if (job.status === 'success') {
    return [
      ...base,
      { text: 'Tests: 220 passed, 220 total', color: '#7fd79a' },
      { text: `Job succeeded in ${job.duration}`, color: '#7fd79a' },
    ];
  }
  return [...base, { text: `Job is ${job.status}.`, color: '#938f99' }];
}

function clonePipelines(list) {
  return list.map((pipeline) => ({
    ...pipeline,
    stages: pipeline.stages.map((stage) => ({
      ...stage,
      jobs: stage.jobs.map((job) => ({ ...job })),
    })),
  }));
}

const SEED_PIPELINES = [
  {
    id: 8821,
    title: 'Merge branch perf/board-virtual',
    sha: 'a41f9c2e',
    branch: 'main',
    origin: 'push',
    status: 'running',
    duration: '03:12',
    stages: [
      {
        name: 'build',
        jobs: [
          { key: 'b1', name: 'compile-assets', status: 'success', duration: '01:44' },
          { key: 'b2', name: 'compile-gems', status: 'success', duration: '02:01' },
        ],
      },
      {
        name: 'test',
        jobs: [
          { key: 't1', name: 'jest 1/4', status: 'success', duration: '04:12' },
          { key: 't2', name: 'jest 2/4', status: 'running', duration: '02:38' },
          { key: 't3', name: 'rspec unit', status: 'running', duration: '03:05' },
        ],
      },
      { name: 'deploy', jobs: [{ key: 'd1', name: 'review-app', status: 'created', duration: '—' }] },
    ],
  },
  {
    id: 8820,
    title: 'fix/badge-contrast: tonal container colors',
    sha: '7be20d11',
    branch: 'fix/badge-contrast',
    origin: 'merge request',
    status: 'failed',
    duration: '11:47',
    stages: [
      { name: 'build', jobs: [{ key: 'b1', name: 'compile-assets', status: 'success', duration: '01:51' }] },
      {
        name: 'test',
        jobs: [
          { key: 't1', name: 'jest 1/2', status: 'failed', duration: '05:22' },
          { key: 't2', name: 'jest 2/2', status: 'success', duration: '05:39' },
        ],
      },
      { name: 'deploy', jobs: [{ key: 'd1', name: 'review-app', status: 'skipped', duration: '—' }] },
    ],
  },
  {
    id: 8819,
    title: 'Scheduled nightly full suite',
    sha: '90c3aa17',
    branch: 'main',
    origin: 'schedule',
    status: 'success',
    duration: '42:18',
    stages: [
      { name: 'build', jobs: [{ key: 'b1', name: 'compile-assets', status: 'success', duration: '01:48' }] },
      { name: 'test', jobs: [{ key: 't1', name: 'rspec full', status: 'success', duration: '38:02' }] },
      { name: 'deploy', jobs: [{ key: 'd1', name: 'staging', status: 'success', duration: '02:11' }] },
    ],
  },
  {
    id: 8818,
    title: 'API-triggered docs rebuild',
    sha: '5f01bd93',
    branch: 'main',
    origin: 'api',
    status: 'canceled',
    duration: '00:41',
    stages: [
      { name: 'build', jobs: [{ key: 'b1', name: 'docs-lint', status: 'canceled', duration: '00:41' }] },
      { name: 'test', jobs: [{ key: 't1', name: 'link-check', status: 'skipped', duration: '—' }] },
      { name: 'deploy', jobs: [{ key: 'd1', name: 'pages', status: 'manual', duration: '—' }] },
    ],
  },
];

/** Fresh, independent copy every call so mutating one caller's list never leaks into another. */
export function createInitialPipelines() {
  return clonePipelines(SEED_PIPELINES);
}

/** Ported from DCLogic's `_run()`: prepends a fresh manually-triggered pipeline. */
export function createManualPipeline(existingPipelines) {
  const nextId = existingPipelines.reduce((max, p) => Math.max(max, p.id), 0) + 1;
  const sha = Math.random().toString(16).slice(2, 10);
  return {
    id: nextId,
    title: 'Manual run on main',
    sha,
    branch: 'main',
    origin: 'web',
    status: 'running',
    duration: '00:01',
    stages: [
      { name: 'build', jobs: [{ key: 'b1', name: 'compile-assets', status: 'running', duration: '00:01' }] },
      {
        name: 'test',
        jobs: [
          { key: 't1', name: 'jest 1/4', status: 'created', duration: '—' },
          { key: 't2', name: 'rspec unit', status: 'created', duration: '—' },
        ],
      },
      { name: 'deploy', jobs: [{ key: 'd1', name: 'review-app', status: 'created', duration: '—' }] },
    ],
  };
}

/** In-place-style helpers used by retry/cancel actions; each returns a new pipeline object. */
export function retriedPipeline(pipeline) {
  const next = { ...pipeline, status: 'running', stages: pipeline.stages.map((stage) => ({ ...stage, jobs: stage.jobs.map((job) => ({ ...job })) })) };
  next.stages.forEach((stage) => {
    stage.jobs.forEach((job) => {
      if (job.status === 'failed' || job.status === 'canceled') {
        job.status = 'running';
        job.duration = '00:01';
      }
    });
  });
  return next;
}

export function canceledPipeline(pipeline) {
  const next = { ...pipeline, status: 'canceled', stages: pipeline.stages.map((stage) => ({ ...stage, jobs: stage.jobs.map((job) => ({ ...job })) })) };
  next.stages.forEach((stage) => {
    stage.jobs.forEach((job) => {
      if (job.status === 'running' || job.status === 'created') job.status = 'canceled';
    });
  });
  return next;
}

export function retriedJob(pipeline, jobKey) {
  const next = { ...pipeline, status: 'running', stages: pipeline.stages.map((stage) => ({ ...stage, jobs: stage.jobs.map((job) => ({ ...job })) })) };
  next.stages.forEach((stage) => {
    stage.jobs.forEach((job) => {
      if (`${stage.name}:${job.key}` === jobKey) {
        job.status = 'running';
        job.duration = '00:01';
      }
    });
  });
  return next;
}
