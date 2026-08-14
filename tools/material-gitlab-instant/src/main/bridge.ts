import { BrowserWindow, ipcMain, net, session } from 'electron';
import { DEFAULT_LOCAL_CONFIG, parseLocalGitLabConfig, readinessUrl } from '../shared/configuration';
import type { LocalGitLabConfig, OpenInstanceResult, ReadinessResult } from '../shared/bridge';
import { CHANNELS } from '../shared/channels';

const READINESS_TIMEOUT_MS = 2500;
const READY_STATUSES = new Set([200, 204]);
let config: LocalGitLabConfig = DEFAULT_LOCAL_CONFIG;
let lastReady: ReadinessResult | undefined;

async function checkReadiness(): Promise<ReadinessResult> {
  let url: string;
  try { url = readinessUrl(config); } catch { return { state: 'invalid', origin: config.origin, checkedAt: new Date().toISOString(), reason: 'invalid-config' }; }
  const checkedAt = new Date().toISOString();
  try {
    const request = net.request({ method: 'GET', url, session: session.defaultSession });
    const result = await new Promise<ReadinessResult>((resolve) => {
      const timer = setTimeout(() => { request.abort(); resolve({ state: 'unreachable', origin: config.origin, checkedAt, reason: 'timeout' }); }, READINESS_TIMEOUT_MS);
      // Readiness is loopback-only. Never follow a redirect to an arbitrary host.
      request.on('redirect', () => { request.abort(); resolve({ state: 'unreachable', origin: config.origin, checkedAt, reason: 'network-error' }); });
      request.on('response', (response) => {
        clearTimeout(timer);
        const state = READY_STATUSES.has(response.statusCode) ? 'ready' : 'not-ready';
        resolve({ state, origin: config.origin, checkedAt, status: response.statusCode, ...(state === 'not-ready' ? { reason: 'http-error' as const } : {}) });
        // Electron's IncomingResponse does not expose Node's resume() in its
        // public type. Drain the bounded readiness body through its typed stream
        // events so the request can finish without relying on an untyped escape.
        response.on('data', () => undefined);
        response.on('end', () => undefined);
      });
      request.on('error', () => { clearTimeout(timer); resolve({ state: 'unreachable', origin: config.origin, checkedAt, reason: 'network-error' }); });
      request.end();
    });
    lastReady = result.state === 'ready' ? result : undefined;
    return result;
  } catch {
    return { state: 'unreachable', origin: config.origin, checkedAt, reason: 'network-error' };
  }
}

async function openVerifiedInstance(): Promise<OpenInstanceResult> {
  const readiness = await checkReadiness();
  if (readiness.state !== 'ready' || !lastReady || lastReady.checkedAt !== readiness.checkedAt) return { opened: false, origin: config.origin, readiness };
  const window = new BrowserWindow({ width: 1280, height: 840, show: true, webPreferences: { contextIsolation: true, nodeIntegration: false } });
  await window.loadURL(config.origin);
  return { opened: true, origin: config.origin, readiness };
}

export function registerPrivilegedBridge(): void {
  ipcMain.handle(CHANNELS.config, () => config);
  ipcMain.handle(CHANNELS.setConfig, (_event, value: unknown) => { config = parseLocalGitLabConfig(value); lastReady = undefined; return config; });
  ipcMain.handle(CHANNELS.readiness, () => checkReadiness());
  ipcMain.handle(CHANNELS.open, () => openVerifiedInstance());
}
