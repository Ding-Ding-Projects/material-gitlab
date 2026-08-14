import { contextBridge, ipcRenderer } from 'electron';
import { BRIDGE_VERSION } from './shared/bridge';
import { CHANNELS } from './shared/channels';

contextBridge.exposeInMainWorld('gitlabInstant', Object.freeze({
  version: BRIDGE_VERSION,
  getConfig: () => ipcRenderer.invoke(CHANNELS.config),
  setConfig: (value: unknown) => ipcRenderer.invoke(CHANNELS.setConfig, value),
  checkReadiness: () => ipcRenderer.invoke(CHANNELS.readiness),
  openVerifiedInstance: () => ipcRenderer.invoke(CHANNELS.open),
}));
