type TargetKind = 'wsl2' | 'local-docker' | 'ssh-docker';
type DeploymentConfig = {
  schemaVersion: 1;
  projectPath: string;
  image: string;
  target: { kind: TargetKind; label: string; distro?: string; host?: string; user?: string; port?: number };
  environment: Record<string, string>;
  secretRefs: string[];
};
type LifecycleStep = { id: string; title: string; kind: 'preflight' | 'approval' | 'execute' | 'rollback'; state: 'pending' | 'ready' | 'skipped'; detail: string };
type WorkflowPlan = { target: TargetKind; state: 'ready' | 'blocked'; steps: LifecycleStep[] };

interface Window {
  deployer: {
    version: string;
    executionEnabled: false;
    plan: (input: DeploymentConfig) => Promise<{ ok: true; value: WorkflowPlan } | { ok: false; error: string }>;
  };
}

type Phase = 'configure' | 'review' | 'cancelled';
const targetCopy: Record<TargetKind, { title: string; detail: string; requirement: string }> = {
  wsl2: { title: 'WSL2', detail: 'Run Docker through a selected Linux distribution.', requirement: 'Requires an installed WSL2 distribution.' },
  'local-docker': { title: 'Local Docker', detail: 'Use the Docker Engine on this computer.', requirement: 'Uses only the local Docker socket.' },
  'ssh-docker': { title: 'SSH Docker host', detail: 'Review an SSH-wrapped plan for an approved host.', requirement: 'Enter a host and user before this target can be reviewed.' },
};

const root = document.querySelector<HTMLDivElement>('#app');
if (!root) throw new Error('Renderer root is missing.');
const appRoot = root;
let selected: TargetKind = 'local-docker';
let phase: Phase = 'configure';
let planText = '';
let errorText = '';

const escapeHtml = (value: string): string => value.replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char] ?? char));
function input(id: string, fallback: string): string { return document.querySelector<HTMLInputElement>(`#${id}`)?.value.trim() || fallback; }
function config(): DeploymentConfig {
  const projectPath = input('project-path', 'deploy');
  const image = input('image', 'gitlab/gitlab-ee:latest');
  const host = input('host', '');
  const user = input('user', '');
  const distro = input('distro', 'Ubuntu');
  const target = selected === 'wsl2'
    ? { kind: selected, label: targetCopy[selected].title, distro }
    : selected === 'ssh-docker'
      ? { kind: selected, label: targetCopy[selected].title, host, user, port: Number(input('port', '22')) }
      : { kind: selected, label: targetCopy[selected].title };
  return { schemaVersion: 1, projectPath, image, target, environment: { GITLAB_OMNIBUS_CONFIG: 'vault://gitlab/config' }, secretRefs: ['gitlab/config'] };
}
function readiness(): { ready: boolean; message: string } {
  if (selected === 'ssh-docker' && (!input('host', '') || !input('user', ''))) return { ready: false, message: 'Add an SSH host and user to enable plan review. No connection is attempted here.' };
  return { ready: true, message: selected === 'wsl2' ? 'The selected distribution is recorded for review; WSL2 is not contacted.' : selected === 'local-docker' ? 'Local Docker is selected; this screen only creates a plan.' : 'SSH details are complete; this screen only creates a plan.' };
}
function render(): void {
  const status = readiness();
  const planMarkup = planText || '<p class="empty">Generate a bounded command plan to inspect the proposed steps. Nothing will execute.</p>';
  appRoot.innerHTML = `<div class="shell">
    <aside class="rail"><div class="brand">Material deployer</div><div class="eyebrow">GitLab operations</div><nav class="nav" aria-label="Primary"><button aria-current="page">Plan deployment</button><button disabled title="Available after a plan is generated">Targets <span>locked</span></button><button disabled title="No deployment has run">Activity <span>preview only</span></button></nav><div class="rail-note"><strong>Preview boundary</strong><p>Configuration and review only. No host, Docker engine, or SSH endpoint is contacted.</p></div></aside>
    <section class="content"><header class="topbar"><div><p class="kicker">Configuration workspace</p><h1>Plan a safe deployment</h1><p class="subtitle">Choose an endpoint, supply bounded inputs, and review the generated command plan before an approved executor receives it.</p></div><div class="status ${phase === 'cancelled' ? 'status-cancelled' : 'status-preview'}">${phase === 'cancelled' ? '● Review cancelled' : '● Preview only'}</div></header>
      <div class="progress" aria-label="Plan progress"><div class="progress-step active"><span>1</span><b>Configure</b><small>Inputs and target</small></div><div class="progress-line"></div><div class="progress-step ${phase === 'review' ? 'active' : ''}"><span>2</span><b>Review</b><small>Commands and redactions</small></div><div class="progress-line"></div><div class="progress-step ${phase === 'cancelled' ? 'active cancelled' : ''}"><span>3</span><b>${phase === 'cancelled' ? 'Cancelled' : 'Handoff'}</b><small>${phase === 'cancelled' ? 'No changes made' : 'Executor not connected'}</small></div></div>
      <div class="grid"><section class="card"><div class="card-heading"><div><p class="step-label">Step 1</p><h2>Configure a target</h2></div><span class="badge">Guided</span></div><div class="targets">${Object.entries(targetCopy).map(([kind, copy]) => `<label class="target ${selected === kind ? 'selected' : ''}"><input type="radio" name="target" value="${kind}" ${selected === kind ? 'checked' : ''}/><span><strong>${copy.title}</strong><small>${copy.detail}</small><em>${copy.requirement}</em></span></label>`).join('')}</div>
      <div class="fields"><div class="field"><label for="project-path">Project directory</label><input id="project-path" type="text" value="${escapeHtml(input('project-path', 'deploy'))}" autocomplete="off" aria-describedby="project-path-support" /><small id="project-path-support">Relative or absolute path accepted by the bounded planner.</small></div><div class="field"><label for="image">Container image</label><input id="image" type="text" value="${escapeHtml(input('image', 'gitlab/gitlab-ee:latest'))}" autocomplete="off" aria-describedby="image-support" /><small id="image-support">Image reference is validated before it enters the plan.</small></div><div id="wsl-fields" ${selected === 'wsl2' ? '' : 'hidden'}><div class="field"><label for="distro">WSL2 distribution</label><input id="distro" type="text" value="${escapeHtml(input('distro', 'Ubuntu'))}" autocomplete="off" aria-describedby="distro-support" /><small id="distro-support">Name of the installed distribution used for planning.</small></div></div><div id="ssh-fields" ${selected === 'ssh-docker' ? '' : 'hidden'}><div class="field"><label for="user">SSH user</label><input id="user" type="text" value="${escapeHtml(input('user', 'deploy'))}" autocomplete="off" aria-describedby="user-support" /><small id="user-support">Account name for the reviewed SSH target.</small></div><div class="field"><label for="host">SSH host</label><input id="host" type="text" value="${escapeHtml(input('host', ''))}" placeholder="docker.example.internal" autocomplete="off" aria-describedby="host-support" /><small id="host-support">Host is required before an SSH plan can be reviewed.</small></div><div class="field"><label for="port">SSH port</label><input id="port" type="number" value="22" min="1" max="65535" inputmode="numeric" aria-describedby="port-support" /><small id="port-support">Use a TCP port from 1 through 65535.</small></div></div></div><p class="hint boundary">🔒 Secrets stay as vault references. This preview never reads, prints, stores, or transmits secret values.</p></section>
      <section class="card review-card"><div class="card-heading"><div><p class="step-label">Step 2</p><h2>Review command plan</h2></div><span class="badge neutral">No execution</span></div><div class="readiness ${status.ready ? 'ready' : 'blocked'}" role="status"><span>${status.ready ? '✓' : '!'}</span><div><strong>${status.ready ? 'Ready for local review' : 'Review is disabled'}</strong><p>${status.message}</p></div></div><div class="plan" id="plan">${planMarkup}</div><div class="actions"><button class="button text" id="cancel">Cancel review</button><button class="button" id="preview" ${status.ready ? '' : 'disabled'}>${phase === 'review' ? 'Regenerate plan' : 'Generate plan'}</button></div></section></div>
      ${errorText ? `<div class="error" role="alert">${escapeHtml(errorText)}</div>` : ''}
      <footer class="footer-note">Rollback status: <strong>${phase === 'cancelled' ? 'No operation started; nothing to roll back.' : 'Not applicable until an approved executor runs a plan.'}</strong></footer>
    </section></div>`;
  appRoot.querySelectorAll<HTMLInputElement>('input[name="target"]').forEach((radio) => radio.addEventListener('change', () => { selected = radio.value as TargetKind; phase = 'configure'; planText = ''; errorText = ''; render(); }));
  appRoot.querySelector<HTMLButtonElement>('#preview')?.addEventListener('click', async () => {
    try {
      const response = await window.deployer.plan(config());
      if (!response.ok) throw new Error(response.error);
      planText = response.value.steps.map((step) => `<article class="step"><div class="step-title"><span>${escapeHtml(step.kind)}</span><strong>${escapeHtml(step.title)}</strong></div><code>${escapeHtml(step.state)}</code><p class="hint">${escapeHtml(step.detail)}</p></article>`).join('');
      phase = 'review';
      errorText = '';
    } catch (error) {
      errorText = error instanceof Error ? error.message : 'The plan could not be built.';
    }
    render();
  });
  appRoot.querySelector<HTMLButtonElement>('#cancel')?.addEventListener('click', () => { phase = 'cancelled'; planText = ''; errorText = ''; render(); });
}
render();
