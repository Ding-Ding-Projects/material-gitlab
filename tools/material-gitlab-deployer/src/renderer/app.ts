import { buildCommandPlan, formatStep } from '../shared/plan';
import type { DeploymentConfig, TargetKind } from '../shared/model';

const targetCopy: Record<TargetKind, { title: string; detail: string }> = {
  wsl2: { title: 'WSL2', detail: 'Run Docker through a selected Linux distribution.' },
  'local-docker': { title: 'Local Docker', detail: 'Use the Docker Engine on this computer.' },
  'ssh-docker': { title: 'SSH Docker host', detail: 'Connect to a Docker Engine over SSH.' },
};

const root = document.querySelector<HTMLDivElement>('#app');
if (!root) throw new Error('Renderer root is missing.');

let selected: TargetKind = 'local-docker';
let planText = '';

function config(): DeploymentConfig {
  const projectPath = document.querySelector<HTMLInputElement>('#project-path')?.value.trim() || './deploy';
  const image = document.querySelector<HTMLInputElement>('#image')?.value.trim() || 'gitlab/gitlab-ee:latest';
  const host = document.querySelector<HTMLInputElement>('#host')?.value.trim();
  const user = document.querySelector<HTMLInputElement>('#user')?.value.trim();
  return { projectPath, image, target: { kind: selected, label: targetCopy[selected].title, host, user }, environment: { GITLAB_OMNIBUS_CONFIG: 'vault://gitlab/config' }, secretRefs: ['gitlab/config'] };
}

function render(): void {
  root.innerHTML = `<div class="shell">
    <aside class="rail"><div class="brand">Material deployer</div><div class="eyebrow">GitLab operations</div><nav class="nav" aria-label="Primary"><button aria-current="page">Plan deployment</button><button>Targets</button><button>Activity</button></nav></aside>
    <section class="content"><header class="topbar"><div><h1>Plan a safe deployment</h1><p class="subtitle">Choose an endpoint, review the generated command plan, then hand it to an approved executor.</p></div><div class="status">● Preview only</div></header>
      <div class="grid"><section class="card"><h2>1. Select a target</h2><div class="targets">${Object.entries(targetCopy).map(([kind, copy]) => `<label class="target"><input type="radio" name="target" value="${kind}" ${selected === kind ? 'checked' : ''}/><span><strong>${copy.title}</strong><small>${copy.detail}</small></span></label>`).join('')}</div>
      <h2 style="margin-top:24px">2. Deployment inputs</h2><label class="field">Project directory<input id="project-path" type="text" value="./deploy" autocomplete="off" /></label><label class="field">Container image<input id="image" type="text" value="gitlab/gitlab-ee:latest" autocomplete="off" /></label><div id="ssh-fields" hidden><label class="field">SSH user<input id="user" type="text" value="deploy" /></label><label class="field">SSH host<input id="host" type="text" placeholder="docker.example.internal" /></label></div><p class="hint">Secrets stay as vault references. This preview never reads, prints, or transmits secret values.</p></section>
      <section class="card"><h2>3. Review command plan</h2><div class="plan" id="plan">${planText || '<p class="hint">Your target and inputs will produce a bounded plan here.</p>'}</div><div class="actions"><button class="button" id="preview">Refresh preview</button></div></section></div>
    </section></div>`;
  root.querySelectorAll<HTMLInputElement>('input[name="target"]').forEach((input) => input.addEventListener('change', () => { selected = input.value as TargetKind; render(); }));
  root.querySelector<HTMLDivElement>('#ssh-fields')!.hidden = selected !== 'ssh-docker';
  root.querySelector<HTMLButtonElement>('#preview')!.addEventListener('click', () => {
    try { const plan = buildCommandPlan(config()); planText = plan.steps.map((step) => `<article class="step"><strong>${step.title}</strong><code>${formatStep(step)}</code><p class="hint">${step.rationale}</p></article>`).join(''); } catch (error) { planText = `<p class="hint">${error instanceof Error ? error.message : 'The plan could not be built.'}</p>`; }
    render();
  });
}

render();
