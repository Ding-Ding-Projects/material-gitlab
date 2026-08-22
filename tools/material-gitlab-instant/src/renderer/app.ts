import type { InstanceConfig, InstanceTarget, ReadinessResult } from '../shared/model';

const root = document.querySelector<HTMLDivElement>('#app');
if (!root) throw new Error('GitLab Instant renderer root is missing.');
const appRoot = root;

const bridge = window.gitlabInstant;
let configuration: InstanceConfig;
let readiness: ReadinessResult = {
  state: 'not-ready',
  target: 'local-wsl2',
  checkedAt: new Date(0).toISOString(),
  reason: 'Readiness has not been checked yet.',
};
let activeTab: 'overview' | 'instance' | 'help' = 'overview';

const escapeHtml = (value: string): string => value.replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character] ?? character);

function readinessCopy(value: ReadinessResult): { label: string; tone: string; detail: string } {
  if (value.state === 'ready') return { label: 'Ready', tone: 'positive', detail: value.reason };
  if (value.state === 'unsupported') return { label: 'Configuration only', tone: 'neutral', detail: value.reason };
  return { label: 'Not ready', tone: 'negative', detail: value.reason };
}

function targetLabel(target: InstanceTarget): string {
  return target === 'local-wsl2' ? 'Local WSL2' : target === 'local-docker' ? 'Local Docker' : 'Remote SSH (configuration only)';
}

function render(): void {
  const status = readinessCopy(readiness);
  const configuredName = escapeHtml(configuration.label);
  appRoot.innerHTML = `<div class="app-shell">
    <aside class="navigation" aria-label="GitLab Instant navigation">
      <div class="brand-lockup"><img src="./assets/gitlab-instant-mark.svg" alt="" width="42" height="42" /><div><strong>GitLab Instant</strong><span>Local delivery workspace</span></div></div>
      <nav class="tab-list" role="tablist" aria-label="Workspace sections">
        ${tabMarkup('overview', 'Overview')}${tabMarkup('instance', 'Local instance')}${tabMarkup('help', 'Help')}
      </nav>
      <div class="nav-footer"><span class="status-dot ${status.tone}" aria-hidden="true"></span><span>${status.label}</span></div>
    </aside>
    <main class="main-content">
      <header class="topbar"><div><p class="eyebrow">Material 3 · local-first</p><h1>Bring your GitLab home.</h1><p class="lede">A calm, focused handoff into one local GitLab instance. No sample projects, no hidden network calls.</p></div><span class="readiness-chip ${status.tone}">${status.label}</span></header>
      ${activeTab === 'overview' ? overviewMarkup(configuredName, status) : activeTab === 'instance' ? instanceMarkup(status) : helpMarkup()}
    </main>
  </div>`;
  appRoot.querySelectorAll<HTMLButtonElement>('[data-tab]').forEach((button) => button.addEventListener('click', () => { activeTab = (button.dataset.tab as typeof activeTab) ?? 'overview'; render(); }));
  appRoot.querySelector<HTMLButtonElement>('#configure-instance')?.addEventListener('click', () => { activeTab = 'instance'; render(); appRoot.querySelector<HTMLSelectElement>('#target')?.focus(); });
  appRoot.querySelector<HTMLButtonElement>('#check-readiness')?.addEventListener('click', () => void checkInstance());
  appRoot.querySelector<HTMLFormElement>('#instance-form')?.addEventListener('submit', (event) => void saveInstance(event));
  appRoot.querySelector<HTMLButtonElement>('#open-instance')?.addEventListener('click', () => void openInstance());
}

function tabMarkup(id: typeof activeTab, label: string): string {
  return `<button class="tab ${activeTab === id ? 'is-active' : ''}" role="tab" aria-selected="${activeTab === id}" aria-controls="${id}-panel" data-tab="${id}">${label}</button>`;
}

function overviewMarkup(name: string, status: { label: string; tone: string; detail: string }): string {
  const ready = readiness.state === 'ready';
  return `<section id="overview-panel" class="hero-grid" role="tabpanel"><article class="card welcome-card"><p class="eyebrow">Your workspace</p><h2>${ready ? `Welcome back to ${name}.` : 'Start with an honest empty state.'}</h2><p>${ready ? status.detail : 'There are no projects or pipelines loaded yet. Connect a local instance to see the data that actually belongs to you.'}</p><button class="filled-button" id="${ready ? 'open-instance' : 'configure-instance'}">${ready ? 'Open local GitLab' : 'Configure local instance'}</button></article><article class="card readiness-card"><div class="card-heading"><div><p class="eyebrow">Readiness</p><h2>${status.label}</h2></div><span class="status-dot ${status.tone}" aria-hidden="true"></span></div><p>${escapeHtml(status.detail)}</p><dl class="readiness-list"><div><dt>Target</dt><dd>${targetLabel(configuration.target)}</dd></div><div><dt>Instance</dt><dd>Local instance only</dd></div><div><dt>Last checked</dt><dd>${escapeHtml(readiness.checkedAt)}</dd></div></dl></article></section><section class="card empty-state"><div class="empty-icon" aria-hidden="true">⌁</div><div><p class="eyebrow">Projects</p><h2>No projects yet</h2><p>This space stays empty until your local GitLab provides real projects. GitLab Instant will never invent sample data to make the screen look busy.</p></div></section>`;
}

function instanceMarkup(status: { label: string; tone: string; detail: string }): string {
  const target = configuration.target;
  return `<section id="instance-panel" class="card form-card" role="tabpanel"><div class="card-heading"><div><p class="eyebrow">Local instance handoff</p><h2>Connect a GitLab you control</h2><p class="supporting">Choose where your local instance runs. Remote SSH is saved as configuration only; this app never creates or contacts a host.</p></div><span class="readiness-chip ${status.tone}">${status.label}</span></div><form id="instance-form"><label class="field">Target<span class="field-hint">Readiness probes run only for local targets.</span><select id="target" name="target"><option value="local-wsl2" ${target === 'local-wsl2' ? 'selected' : ''}>Local WSL2</option><option value="local-docker" ${target === 'local-docker' ? 'selected' : ''}>Local Docker</option><option value="remote-ssh" ${target === 'remote-ssh' ? 'selected' : ''}>Remote SSH (configuration only)</option></select></label><label class="field">Instance label<span class="field-hint">A display label for this local connection.</span><input id="instance-label" name="label" value="${escapeHtml(configuration.label)}" autocomplete="off" /></label><label class="field">Port<span class="field-hint">The local GitLab HTTP port, 1–65535.</span><input id="port" name="port" type="number" min="1" max="65535" value="${configuration.port}" required /></label>${target === 'local-wsl2' ? `<label class="field">WSL2 distribution<span class="field-hint">The installed distribution that hosts GitLab.</span><input id="distro" name="distro" value="${escapeHtml(configuration.distro ?? 'Ubuntu')}" autocomplete="off" /></label>` : ''}${target === 'remote-ssh' ? `<div class="two-fields"><label class="field">Host<input id="host" name="host" value="${escapeHtml(configuration.host ?? '')}" autocomplete="off" /></label><label class="field">User<input id="user" name="user" value="${escapeHtml(configuration.user ?? '')}" autocomplete="off" /></label></div>` : ''}<div class="form-actions"><button class="tonal-button" type="button" id="check-readiness">Check readiness</button><button class="filled-button" type="submit" id="save-instance">Save local instance</button></div></form><p class="form-status" id="form-status" role="status">${escapeHtml(status.detail)}</p></section>`;
}

function helpMarkup(): string { return `<section id="help-panel" class="card help-card" role="tabpanel"><p class="eyebrow">A little context</p><h2>Local means local.</h2><p>GitLab Instant is a desktop handoff surface for a GitLab instance running on your machine. It does not ship fake projects, upload credentials, or depend on a CDN.</p><div class="callout"><strong>What you can expect</strong><span>Truthful readiness state, accessible keyboard navigation, and a clear route back to your local instance when it is available.</span></div></section>`; }

async function checkInstance(): Promise<void> {
  readiness = { ...readiness, state: 'not-ready', reason: 'Checking the local instance…', checkedAt: new Date().toISOString() };
  render();
  readiness = bridge ? await bridge.checkReadiness(configuration) : { ...readiness, reason: 'The native readiness bridge is unavailable.' };
  render();
}

async function saveInstance(event: SubmitEvent): Promise<void> {
  event.preventDefault();
  const form = event.currentTarget as HTMLFormElement;
  const data = new FormData(form);
  const target = String(data.get('target') ?? 'local-wsl2') as InstanceTarget;
  const next: { schemaVersion: 1; target: InstanceTarget; label: string; port: number; distro?: string; host?: string; user?: string } = { schemaVersion: 1, target, label: String(data.get('label') ?? '').trim(), port: Number(data.get('port')) };
  if (target === 'local-wsl2') next.distro = String(data.get('distro') ?? '').trim();
  if (target === 'remote-ssh') { next.host = String(data.get('host') ?? '').trim(); next.user = String(data.get('user') ?? '').trim(); }
  try {
    configuration = bridge ? await bridge.saveConfiguration(next) : next;
    await checkInstance();
    activeTab = 'overview';
    render();
  } catch (error) {
    readiness = { ...readiness, state: 'not-ready', reason: error instanceof Error ? error.message : 'Configuration could not be saved.' };
    render();
  }
}

async function openInstance(): Promise<void> {
  if (!bridge) return;
  const result = await bridge.openInstance();
  if (!result.opened) { readiness = { ...readiness, state: 'not-ready', reason: result.reason ?? 'The local instance is not ready.' }; render(); }
}

async function bootstrap(): Promise<void> {
  configuration = bridge ? await bridge.getConfiguration() : { schemaVersion: 1, target: 'local-wsl2', label: 'Local GitLab', port: 8080, distro: 'Ubuntu' };
  readiness = bridge ? await bridge.checkReadiness(configuration) : readiness;
  render();
}

void bootstrap();
