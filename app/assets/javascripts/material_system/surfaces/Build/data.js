import { createGitLabClient, requireProjectPath } from '../gitlabApi';

export const BUILD_TABS = Object.freeze([
  { id: 'jobs', label: 'Jobs' },
  { id: 'editor', label: 'Editor' },
  { id: 'schedules', label: 'Schedules' },
  { id: 'testCases', label: 'Test cases' },
  { id: 'artifacts', label: 'Artifacts' },
]);
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

export const DEFAULT_PIPELINE_YAML = '';
const toStatus = (job) => job.status || 'created';
const toJob = (job) => ({ id: job.id, name: job.name, sub: `#${job.pipeline?.id || job.pipeline_id || ''} · ${job.stage || ''} · ${job.runner?.description || ''}`, status: toStatus(job), when: job.duration == null ? '—' : String(job.duration), artifactsFile: job.artifacts_file });
const toSchedule = (item) => ({ id: item.id, name: item.description || item.ref || `Schedule #${item.id}`, sub: `${item.cron || ''} · ${item.ref || ''}`, active: Boolean(item.active) });
const toTestCase = (item) => ({ id: item.id, name: item.name || item.title || '', sub: item.path || item.description || '', status: item.status || 'passing' });
const toArtifact = (job) => ({ id: job.id, name: job.artifacts_file?.filename || '', sub: `#${job.pipeline?.id || job.pipeline_id || ''} · ${job.name}`, size: job.artifacts_file?.size || '—', expiresIn: job.artifacts_expire_at || '—', kept: Boolean(job.artifacts_file?.filename && !job.artifacts_expire_at) });

export async function fetchJobs({ projectPath, params = {}, client = createGitLabClient(projectPath) } = {}) { requireProjectPath(projectPath); return (await client.listJobs({ per_page: 50, ...params })).map(toJob); }
export async function fetchSchedules({ projectPath, params = {}, client = createGitLabClient(projectPath) } = {}) { requireProjectPath(projectPath); return (await client.listPipelineSchedules({ per_page: 50, ...params })).map(toSchedule); }
export async function fetchTestCases({ projectPath, params = {}, client = createGitLabClient(projectPath) } = {}) { requireProjectPath(projectPath); return (await client.listTestCases({ per_page: 50, ...params })).map(toTestCase); }
export async function fetchArtifacts({ projectPath, params = {}, client = createGitLabClient(projectPath) } = {}) { requireProjectPath(projectPath); return (await client.listJobs({ scope: 'all', per_page: 50, ...params })).filter((job) => job.artifacts_file?.filename).map(toArtifact); }

export async function fetchPipelineYaml({ projectPath, ref = 'HEAD', client = createGitLabClient(projectPath) } = {}) {
  requireProjectPath(projectPath);
  const file = await client.getRepositoryFile('.gitlab-ci.yml', ref);
  return file.content ? atob(file.content.replace(/\s/g, '')) : '';
}
export async function commitPipelineYaml({ projectPath, yaml, branch = 'main', client = createGitLabClient(projectPath) } = {}) {
  requireProjectPath(projectPath);
  return client.updateRepositoryFile('.gitlab-ci.yml', { branch, content: yaml, commit_message: 'Update .gitlab-ci.yml from Build editor' });
}
export async function retryJob({ projectPath, id, client = createGitLabClient(projectPath) } = {}) { requireProjectPath(projectPath); return client.retryJob(id); }
export async function setScheduleActive({ projectPath, id, active, client = createGitLabClient(projectPath) } = {}) { requireProjectPath(projectPath); return client.updatePipelineSchedule(id, active); }
export async function setTestCaseStatus({ projectPath, id, status } = {}) { requireProjectPath(projectPath); throw new Error(`Test case status updates are not supported by this GitLab instance (requested ${id} → ${status}).`); }
export async function setArtifactKept({ projectPath, id, kept, client = createGitLabClient(projectPath) } = {}) { requireProjectPath(projectPath); return kept ? client.keepJobArtifacts(id) : client.deleteJobArtifacts(id); }
export async function deleteArtifact({ projectPath, id, client = createGitLabClient(projectPath) } = {}) { requireProjectPath(projectPath); return client.deleteJobArtifacts(id); }
export async function deleteArtifacts({ projectPath, ids, client = createGitLabClient(projectPath) } = {}) { requireProjectPath(projectPath); return Promise.all(ids.map((id) => client.deleteJobArtifacts(id))); }

export function lintPipelineYaml(yaml) {
  const source = String(yaml || '');
  const valid = /stages:/.test(source) && !/\t/.test(source);
  const stagesBlock = (source.match(/^stages:\n((?:\s+-\s+.+\n?)+)/m) || ['', ''])[1];
  const stages = stagesBlock.split('\n').map((line) => line.replace(/^\s*-\s*/, '').trim()).filter(Boolean);
  return { valid, stages, message: valid ? `Syntax is valid · ${stages.length} stage${stages.length === 1 ? '' : 's'} detected` : 'Invalid: tabs not allowed / missing stages block' };
}

export function matchesQuery(text, query, isRegex) {
  if (!query) return true;
  if (isRegex) { try { return new RegExp(query, 'i').test(text); } catch (_error) { return false; } }
  return text.toLowerCase().includes(query.toLowerCase());
}
