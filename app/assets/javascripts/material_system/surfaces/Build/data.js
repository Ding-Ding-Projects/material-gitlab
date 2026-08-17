/**
 * View model for the Build surface (Jobs, pipeline editor, schedules, test
 * cases, artifacts), ported from the Build.dc.html design's `state` and
 * `renderVals()`.
 *
 * Every collection is exposed behind an async `fetchX()` function and every
 * mutation behind an async function that resolves the way a real endpoint
 * would. The seed data below stands in for those endpoints today; swapping
 * a `fetchJobs()` body for `axios.get('/api/v4/projects/:id/jobs')` (and the
 * equivalent for the other three collections and the mutations) is the only
 * change a real integration needs — callers already treat every one of
 * these as asynchronous and already reconcile local state from the
 * resolved value rather than assuming the seed shape.
 */

export const BUILD_TABS = Object.freeze([
  { id: 'jobs', label: 'Jobs' },
  { id: 'editor', label: 'Editor' },
  { id: 'schedules', label: 'Schedules' },
  { id: 'testCases', label: 'Test cases' },
  { id: 'artifacts', label: 'Artifacts' },
]);

// Mirrors the design's `stMeta` lookup: icon, foreground color token, and
// container (background) color token for each status a row can carry.
export const STATUS_META = Object.freeze({
  success: Object.freeze({ icon: 'check_circle', color: 'var(--good)', container: 'var(--goodc)', label: 'Success' }),
  running: Object.freeze({ icon: 'sync', color: 'var(--warn)', container: 'var(--warnc)', label: 'Running' }),
  failed: Object.freeze({ icon: 'cancel', color: 'var(--err)', container: 'var(--errc)', label: 'Failed' }),
  created: Object.freeze({ icon: 'pending', color: 'var(--onsurfv)', container: 'var(--surfch)', label: 'Created' }),
  manual: Object.freeze({ icon: 'play_circle', color: 'var(--onprimc)', container: 'var(--primc)', label: 'Manual' }),
  passing: Object.freeze({ icon: 'check_circle', color: 'var(--good)', container: 'var(--goodc)', label: 'Passing' }),
  flaky: Object.freeze({ icon: 'warning', color: 'var(--warn)', container: 'var(--warnc)', label: 'Flaky' }),
  quarantined: Object.freeze({ icon: 'do_not_disturb_on', color: 'var(--err)', container: 'var(--errc)', label: 'Quarantined' }),
});

export const DEFAULT_PIPELINE_YAML = [
  'stages:',
  '  - build',
  '  - test',
  '  - deploy',
  '',
  'compile-assets:',
  '  stage: build',
  '  script: yarn build',
  '',
  'jest:',
  '  stage: test',
  '  parallel: 4',
  '  script: yarn jest --shard $CI_NODE_INDEX/$CI_NODE_TOTAL',
  '',
  'review-app:',
  '  stage: deploy',
  '  environment: review',
  '  script: bin/deploy review',
].join('\n');

let idSequence = 0;
const nextId = (prefix) => `${prefix}-${(idSequence += 1)}`;

function seedJobs() {
  return [
    { id: nextId('job'), name: 'jest 2/4', sub: '#8821 · test · runner saas-linux-medium', status: 'running', when: '02:38' },
    { id: nextId('job'), name: 'rspec unit', sub: '#8821 · test · runner saas-linux-large', status: 'running', when: '03:05' },
    { id: nextId('job'), name: 'jest 1/2', sub: '#8820 · test · runner saas-linux-medium', status: 'failed', when: '05:22' },
    { id: nextId('job'), name: 'compile-assets', sub: '#8821 · build · cache hit', status: 'success', when: '01:44' },
    { id: nextId('job'), name: 'review-app', sub: '#8821 · deploy · waiting on test', status: 'created', when: '—' },
    { id: nextId('job'), name: 'pages', sub: '#8818 · deploy · manual gate', status: 'manual', when: '—' },
  ];
}

function seedSchedules() {
  return [
    { id: nextId('sched'), name: 'Nightly full suite', sub: '0 2 * * * · main · next run in 9h', active: true },
    { id: nextId('sched'), name: 'Weekly dependency scan', sub: '0 4 * * 1 · main · next run Mon', active: true },
    { id: nextId('sched'), name: 'Docs link check', sub: '0 6 * * 6 · main · paused', active: false },
  ];
}

function seedTestCases() {
  return [
    { id: nextId('test'), name: 'Board drag persists column', sub: 'boards/drag.spec.js · quarantined', status: 'quarantined' },
    { id: nextId('test'), name: 'MR widget merges when checks pass', sub: 'mr/widget.spec.js', status: 'passing' },
    { id: nextId('test'), name: 'Regex builder rejects catastrophic patterns', sub: 'search/regex.spec.js', status: 'passing' },
    { id: nextId('test'), name: 'Empty board renders CTA', sub: 'boards/empty.spec.js · flaky 3%', status: 'flaky' },
  ];
}

function seedArtifacts() {
  return [
    { id: nextId('art'), name: 'coverage/index.html', sub: '#8821 jest 1/4 · coverage report', size: '2.1 MB', expiresIn: '2d left', kept: false },
    { id: nextId('art'), name: 'dist/assets.tar.gz', sub: '#8821 compile-assets · build output', size: '18.4 MB', expiresIn: '6d left', kept: false },
    { id: nextId('art'), name: 'junit.xml', sub: '#8820 jest 1/2 · test report', size: '204 KB', expiresIn: '1d left', kept: false },
  ];
}

const delay = (value, ms = 0) => new Promise((resolve) => setTimeout(() => resolve(value), ms));

export function fetchJobs() {
  return delay(seedJobs());
}

export function fetchSchedules() {
  return delay(seedSchedules());
}

export function fetchTestCases() {
  return delay(seedTestCases());
}

export function fetchArtifacts() {
  return delay(seedArtifacts());
}

export function fetchPipelineYaml() {
  return delay(DEFAULT_PIPELINE_YAML);
}

export function commitPipelineYaml(yaml) {
  // Stands in for POST /api/v4/projects/:id/repository/files/.gitlab-ci.yml
  return delay({ committed: true, ref: 'main', yaml });
}

export function retryJob(id) {
  // Stands in for POST /api/v4/projects/:id/jobs/:job_id/retry
  return delay({ id, status: 'running', when: '00:01' });
}

export function setScheduleActive(id, active) {
  // Stands in for POST .../pipeline_schedules/:id/(take_ownership|play) or PUT active=
  return delay({ id, active });
}

export function setTestCaseStatus(id, status) {
  return delay({ id, status });
}

export function setArtifactKept(id, kept) {
  // Stands in for POST /api/v4/projects/:id/jobs/:job_id/artifacts/keep
  return delay({ id, kept });
}

export function deleteArtifact(id) {
  // Stands in for DELETE /api/v4/projects/:id/jobs/:job_id/artifacts
  return delay({ id, deleted: true });
}

export function deleteArtifacts(ids) {
  return delay({ ids, deleted: true });
}

/**
 * Lints a `.gitlab-ci.yml` draft the same way the design does: a `stages:`
 * block must exist and no tab characters may appear. Also extracts the
 * declared stage names so the editor can render them as "visualized
 * stages".
 */
export function lintPipelineYaml(yaml) {
  const source = String(yaml || '');
  const valid = /stages:/.test(source) && !/\t/.test(source);
  const stagesBlock = (source.match(/^stages:\n((?:\s+-\s+.+\n?)+)/m) || ['', ''])[1];
  const stages = stagesBlock
    .split('\n')
    .map((line) => line.replace(/^\s*-\s*/, '').trim())
    .filter(Boolean);
  const message = valid
    ? `Syntax is valid · ${stages.length} stage${stages.length === 1 ? '' : 's'} detected`
    : 'Invalid: tabs not allowed / missing stages block';
  return { valid, stages, message };
}

/** Plain-text (case-insensitive substring) or regex match against one row's searchable text. */
export function matchesQuery(text, query, isRegex) {
  if (!query) return true;
  if (isRegex) {
    try {
      return new RegExp(query, 'i').test(text);
    } catch (_error) {
      return true;
    }
  }
  return text.toLowerCase().includes(query.toLowerCase());
}
