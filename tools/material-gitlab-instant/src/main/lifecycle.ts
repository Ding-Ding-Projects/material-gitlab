import { app, ipcMain, shell } from 'electron';
import { existsSync, readFileSync, writeFileSync, renameSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { spawn } from 'node:child_process';
import { request as httpRequest } from 'node:http';
import { defaultConfiguration, parseInstanceConfig } from '../shared/configuration';
import type { InstanceConfig, ReadinessResult } from '../shared/model';

const CONFIG_FILE = 'instance-config.json';
const IPC = {
  get: 'gitlab-instant:config:get',
  save: 'gitlab-instant:config:save',
  readiness: 'gitlab-instant:readiness:check',
  open: 'gitlab-instant:instance:open',
} as const;

function configPath(): string { return join(app.getPath('userData'), CONFIG_FILE); }

function loadConfig(): InstanceConfig {
  try {
    if (!existsSync(configPath())) return defaultConfiguration();
    return parseInstanceConfig(JSON.parse(readFileSync(configPath(), 'utf8')));
  } catch {
    return defaultConfiguration();
  }
}

function saveConfig(input: unknown): InstanceConfig {
  const config = parseInstanceConfig(input);
  const directory = app.getPath('userData');
  mkdirSync(directory, { recursive: true });
  const temporary = join(directory, `${CONFIG_FILE}.tmp`);
  writeFileSync(temporary, `${JSON.stringify(config, null, 2)}\n`, { encoding: 'utf8', mode: 0o600 });
  renameSync(temporary, configPath());
  return config;
}

function fixedProbe(target: InstanceConfig): { file: string; args: string[] } | undefined {
  if (target.target === 'local-wsl2') return { file: 'wsl.exe', args: ['--status'] };
  if (target.target === 'local-docker') return { file: 'docker.exe', args: ['version', '--format', '{{.Server.Version}}'] };
  return undefined;
}

function probeGitLabHttp(port: number): Promise<{ ok: boolean; detail?: string }> {
  return new Promise((resolve) => {
    const request = httpRequest({
      hostname: '127.0.0.1',
      port,
      path: '/users/sign_in',
      method: 'GET',
      timeout: 2000,
      headers: { accept: 'text/html,application/xhtml+xml' },
    }, (response) => {
      let body = '';
      response.setEncoding('utf8');
      response.on('data', (chunk: string) => {
        if (body.length < 8192) body += chunk.slice(0, 8192 - body.length);
      });
      response.once('end', () => {
        const status = response.statusCode ?? 0;
        const location = String(response.headers.location ?? '');
        const server = String(response.headers.server ?? '');
        const identifiesGitLab = /gitlab/i.test(body) || /gitlab/i.test(server) || (status >= 300 && status < 400 && /users\/sign_in/i.test(location));
        resolve({ ok: identifiesGitLab, detail: identifiesGitLab ? `GitLab HTTP endpoint responded (${status}).` : `HTTP endpoint responded (${status}) but did not identify GitLab.` });
      });
    });
    request.once('timeout', () => { request.destroy(); resolve({ ok: false, detail: 'GitLab HTTP readiness probe timed out.' }); });
    request.once('error', () => resolve({ ok: false, detail: 'The local GitLab HTTP endpoint is unavailable.' }));
    request.end();
  });
}

function probe(target: InstanceConfig): Promise<ReadinessResult> {
  const checkedAt = new Date().toISOString();
  if (target.target === 'remote-ssh') return Promise.resolve({ state: 'unsupported', target: target.target, checkedAt, reason: 'Remote SSH is configuration-only; no host is created or contacted.' });
  const command = fixedProbe(target);
  if (!command) return Promise.resolve({ state: 'unsupported', target: target.target, checkedAt, reason: 'This target has no supported local readiness probe.' });
  return new Promise((resolve) => {
    const child = spawn(command.file, command.args, { stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true, shell: false });
    let output = '';
    child.stdout.on('data', (chunk: Buffer) => { output += chunk.toString('utf8').slice(0, 256); });
    const timer = setTimeout(() => { child.kill(); resolve({ state: 'not-ready', target: target.target, checkedAt, reason: 'Readiness probe timed out.' }); }, 5000);
    child.once('error', () => { clearTimeout(timer); resolve({ state: 'not-ready', target: target.target, checkedAt, reason: `${command.file} is unavailable.` }); });
    child.once('close', (code) => {
      clearTimeout(timer);
      if (code !== 0) {
        resolve({ state: 'not-ready', target: target.target, checkedAt, reason: 'Local runtime did not report ready.' });
        return;
      }
      void probeGitLabHttp(target.port).then((http) => {
        const url = `http://127.0.0.1:${target.port}`;
        resolve(http.ok
          ? { state: 'ready', target: target.target, checkedAt, url, reason: http.detail ?? 'Local GitLab instance is ready.', detail: output.trim() || undefined }
          : { state: 'not-ready', target: target.target, checkedAt, reason: http.detail ?? 'A local runtime responded, but GitLab is not ready.' });
      });
    });
  });
}

export function registerLifecycleBridge(): void {
  ipcMain.handle(IPC.get, () => loadConfig());
  ipcMain.handle(IPC.save, (_event, config: unknown) => saveConfig(config));
  ipcMain.handle(IPC.readiness, (_event, config?: unknown) => probe(config === undefined ? loadConfig() : parseInstanceConfig(config)));
  ipcMain.handle(IPC.open, async () => {
    const readiness = await probe(loadConfig());
    if (readiness.state !== 'ready' || !readiness.url) return { opened: false, reason: readiness.reason };
    await shell.openExternal(readiness.url);
    return { opened: true, url: readiness.url };
  });
}

export { IPC };
