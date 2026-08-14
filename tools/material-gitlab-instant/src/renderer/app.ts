import type { LocalGitLabConfig, ReadinessResult } from '../shared/bridge';

const root = document.querySelector<HTMLDivElement>('#app')!;
if (!root) throw new Error('Renderer root is missing.');
const appRoot: HTMLDivElement = root;

let config: LocalGitLabConfig | undefined;
let readiness: ReadinessResult | undefined;
let busy = false;
let message = 'Load the local configuration, then verify the existing instance.';

function escapeHtml(value: string): string {
  return value.replace(/[&<>'"]/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[character] ?? character);
}

function stateLabel(): string {
  if (!config) return 'Configuration missing';
  if (busy) return 'Checking instance';
  if (!readiness) return 'Not verified';
  return { ready: 'Instance verified', 'not-ready': 'Instance not ready', unreachable: 'Instance unreachable', invalid: 'Configuration invalid' }[readiness.state];
}

function statusClass(): string {
  if (busy) return 'checking';
  return readiness?.state ?? 'missing';
}

async function loadConfig(): Promise<void> {
  if (!window.gitlabInstant) { message = 'The local bridge is unavailable; this window cannot open an instance.'; render(); return; }
  try { config = await window.gitlabInstant.getConfig(); message = 'Configuration loaded. Verification is still required.'; } catch { message = 'Configuration could not be loaded from the local bridge.'; }
  render();
}

async function saveConfig(): Promise<void> {
  const input = document.querySelector<HTMLInputElement>('#origin');
  if (!input || !window.gitlabInstant) return;
  try { config = await window.gitlabInstant.setConfig({ schemaVersion: 1, origin: input.value.trim(), readinessPath: '/-/readiness' }); readiness = undefined; message = 'Configuration saved locally. Verify the existing instance before opening it.'; } catch (error) { message = error instanceof Error ? error.message : 'Configuration was rejected.'; }
  render();
}

async function verify(): Promise<void> {
  if (!window.gitlabInstant) return;
  busy = true; message = 'Reading the configured readiness endpoint. No deployment or mutation is performed.'; render();
  try { readiness = await window.gitlabInstant.checkReadiness(); message = readiness.state === 'ready' ? 'The existing instance answered successfully. This does not prove deployment or production safety.' : `Verification did not pass (${readiness.reason ?? readiness.state}).`; } catch { readiness = undefined; message = 'The readiness check failed before returning a result.'; }
  busy = false; render();
}

async function openVerified(): Promise<void> {
  if (!window.gitlabInstant || readiness?.state !== 'ready') return;
  busy = true; message = 'Rechecking readiness immediately before opening the existing instance.'; render();
  try { const result = await window.gitlabInstant.openVerifiedInstance(); readiness = result.readiness; message = result.opened ? 'Opened the verified existing instance. No deployment was performed.' : 'Opening was refused because the instance was no longer ready.'; } catch { message = 'Opening was refused because verification could not be completed.'; }
  busy = false; render();
}

function render(): void {
  const origin = escapeHtml(config?.origin ?? '');
  const ready = readiness?.state === 'ready' && !busy;
  root.innerHTML = `<div class="app-shell"><aside class="rail"><div class="logo">GitLab Instant</div><p class="eyebrow">Local instance access</p><nav aria-label="Primary"><button class="nav-item active" type="button">Connect</button><button class="nav-item" type="button" disabled title="Available after verification">Deployment plan</button><button class="nav-item" type="button" disabled title="Available after verification">Activity</button></nav></aside><section class="content"><header class="topbar"><div><p class="eyebrow">Existing instance only</p><h1>Connect to a ready GitLab</h1><p class="subtitle">This surface only reads readiness and opens an existing local instance. It never deploys, starts, or configures GitLab.</p></div><div class="status status-${statusClass()}" role="status"><span aria-hidden="true">●</span> ${stateLabel()}</div></header><section class="card onboarding"><p class="step">01 · Configuration</p><h2>Where is your local GitLab?</h2><p class="hint">Use a loopback HTTP(S) origin you already control. Credentials, query strings, fragments, and non-loopback hosts are rejected by the local bridge.</p><label class="field" for="origin">GitLab origin<input id="origin" type="url" value="${origin}" placeholder="http://127.0.0.1:8080" autocomplete="url" /></label><div class="actions"><button id="save" class="button secondary" type="button">Save configuration</button><button id="verify" class="button" type="button" ${config && !busy ? '' : 'disabled'}>Verify readiness</button></div><p class="message ${readiness && readiness.state !== 'ready' ? 'error' : ''}">${escapeHtml(message)}</p><p class="boundary"><strong>Honest boundary:</strong> a verified state means only that <code>/-/readiness</code> returned HTTP 200 or 204. It is not proof of deployment, credentials, permissions, backups, or production safety.</p></section><section class="card open-card"><p class="step">02 · Open</p><h2>Open the verified instance</h2><p class="hint">The button stays unavailable until the bridge has a current successful readiness result. Opening navigates to the configured origin only.</p><button id="open" class="button" type="button" ${ready ? '' : 'disabled'}>Open verified instance</button></section></section></div>`;
  appRoot.querySelector<HTMLButtonElement>('#save')?.addEventListener('click', () => void saveConfig());
  appRoot.querySelector<HTMLButtonElement>('#verify')?.addEventListener('click', () => void verify());
  appRoot.querySelector<HTMLButtonElement>('#open')?.addEventListener('click', () => void openVerified());
}

render();
void loadConfig();
