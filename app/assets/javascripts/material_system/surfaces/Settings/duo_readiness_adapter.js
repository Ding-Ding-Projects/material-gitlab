import csrf from '~/lib/utils/csrf';

export async function checkDuoRunner({ fullPath, endpoint, fetchImpl = globalThis.fetch }) {
  if (!fullPath || typeof endpoint !== 'string' || !endpoint.startsWith('/') || endpoint.startsWith('//') || /[\u0000-\u0020\\]/.test(endpoint)) throw new Error('Duo readiness requires the current project and local endpoint.');
  const response = await fetchImpl(endpoint, {
    method: 'POST', credentials: 'same-origin', redirect: 'error',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json', 'X-CSRF-Token': csrf.token },
    body: JSON.stringify({ query: 'query MaterialSettingsDuoRunner($fullPath: ID!) { project(fullPath: $fullPath) { duoWorkflowRunnerAvailable duoWorkflowUsableRunnerType } }', variables: { fullPath } }),
  });
  if (!response.ok) throw new Error(`Duo runner check failed (${response.status}).`);
  const body = await response.json();
  if (body.errors?.length || typeof body.data?.project?.duoWorkflowRunnerAvailable !== 'boolean') throw new Error('The current project runner status is unavailable for your access.');
  return { runnerAvailable: body.data.project.duoWorkflowRunnerAvailable, usableRunnerType: body.data.project.duoWorkflowUsableRunnerType };
}
