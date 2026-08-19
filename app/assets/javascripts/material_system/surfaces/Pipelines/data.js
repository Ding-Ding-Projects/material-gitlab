import { createGitLabClient, requireProjectPath } from '../gitlabApi';

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

export function statusMeta(status) { return STATUS_META[status] || FALLBACK_STATUS_META; }
export const FILTER_DEFINITIONS = Object.freeze([
  { key: 'failed', label: 'Failed' },
  { key: 'running', label: 'Running' },
]);

export function worstJobStatus(jobs) {
  return jobs.reduce((acc, job) => {
    if (acc === 'failed' || job.status === 'failed') return 'failed';
    if (acc === 'running' || job.status === 'running') return 'running';
    return job.status;
  }, 'success');
}

export function buildJobLog(job) {
  if (!job?.trace) return [];
  return String(job.trace).split(/\r?\n/).filter(Boolean).map((text) => ({ text, color: '#cac4d0' }));
}

const normalizeJob = (job) => ({
  key: String(job.id),
  id: job.id,
  name: job.name,
  status: job.status,
  duration: job.duration == null ? '—' : String(job.duration),
  stage: job.stage || 'build',
  webUrl: job.web_url,
  trace: job.trace,
});

export function normalizePipeline(pipeline, jobs = []) {
  const grouped = jobs.reduce((groups, job) => {
    const normalized = normalizeJob(job);
    (groups[normalized.stage] ||= []).push(normalized);
    return groups;
  }, {});
  const stages = Object.entries(grouped).map(([name, stageJobs]) => ({ name, jobs: stageJobs }));
  return {
    ...pipeline,
    id: pipeline.id,
    title: pipeline.name || pipeline.ref || `Pipeline #${pipeline.id}`,
    sha: pipeline.sha,
    branch: pipeline.ref,
    origin: pipeline.source || 'unknown',
    status: pipeline.status,
    duration: pipeline.duration == null ? '—' : String(pipeline.duration),
    stages,
    webUrl: pipeline.web_url,
  };
}

export async function fetchPipelines({ projectPath, params = {}, client = createGitLabClient(projectPath) } = {}) {
  requireProjectPath(projectPath);
  const pipelines = await client.listPipelines({ per_page: 50, ...params });
  return Promise.all(pipelines.map(async (pipeline) => normalizePipeline(pipeline, await client.listPipelineJobs(pipeline.id))));
}

export async function fetchPipelineDetail({ projectPath, id, client = createGitLabClient(projectPath) } = {}) {
  requireProjectPath(projectPath);
  const [pipeline, jobs] = await Promise.all([client.getPipeline(id), client.listPipelineJobs(id)]);
  return normalizePipeline(pipeline, jobs);
}

export async function fetchJobTrace({ projectPath, jobId, client = createGitLabClient(projectPath) } = {}) {
  requireProjectPath(projectPath);
  return client.getJobTrace(jobId);
}

export function createManualPipeline(response) {
  if (!response) throw new Error('GitLab did not return the created pipeline.');
  return normalizePipeline(response, []);
}

export const retriedPipeline = (pipeline) => ({ ...pipeline, status: 'running' });
export const canceledPipeline = (pipeline) => ({ ...pipeline, status: 'canceled' });
export function retriedJob(pipeline, jobKey) {
  return { ...pipeline, status: 'running', stages: pipeline.stages.map((stage) => ({ ...stage, jobs: stage.jobs.map((job) => String(job.key) === String(jobKey) ? { ...job, status: 'running', duration: '—' } : job) })) };
}
