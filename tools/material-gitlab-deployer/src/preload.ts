import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('deployer', {
  version: '0.1.0',
  executionEnabled: false,
  plan: (input: unknown) => ipcRenderer.invoke('deployer:lifecycle:plan', input),
});
