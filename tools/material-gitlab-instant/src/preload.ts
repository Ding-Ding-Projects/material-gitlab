import { contextBridge, ipcRenderer } from 'electron';

const BRIDGE_VERSION = 1 as const;
const CHANNELS = Object.freeze({
  config: 'gitlab-instant/config',
  setConfig: 'gitlab-instant/set-config',
  readiness: 'gitlab-instant/readiness',
  open: 'gitlab-instant/open',
});

contextBridge.exposeInMainWorld('gitlabInstant', Object.freeze({
  version: BRIDGE_VERSION,
  getConfig: () => ipcRenderer.invoke(CHANNELS.config),
  setConfig: (value: unknown) => ipcRenderer.invoke(CHANNELS.setConfig, value),
  checkReadiness: () => ipcRenderer.invoke(CHANNELS.readiness),
  openVerifiedInstance: () => ipcRenderer.invoke(CHANNELS.open),
}));
