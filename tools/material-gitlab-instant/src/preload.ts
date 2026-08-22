import { contextBridge, ipcRenderer } from 'electron';
import type { GitlabInstantApi, InstanceConfig, ReadinessResult } from './shared/model';

const api: GitlabInstantApi = {
  getConfiguration: () => ipcRenderer.invoke('gitlab-instant:config:get') as Promise<InstanceConfig>,
  saveConfiguration: (config) => ipcRenderer.invoke('gitlab-instant:config:save', config) as Promise<InstanceConfig>,
  checkReadiness: (config) => ipcRenderer.invoke('gitlab-instant:readiness:check', config) as Promise<ReadinessResult>,
  openInstance: () => ipcRenderer.invoke('gitlab-instant:instance:open') as Promise<{ opened: boolean; url?: string; reason?: string }>,
};

contextBridge.exposeInMainWorld('gitlabInstant', api);
