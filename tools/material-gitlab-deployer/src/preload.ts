// The renderer's only door to the main process. Every call is a named, allowlisted request;
// the renderer never sees Node, the file system, or a shell.
import { contextBridge, ipcRenderer } from 'electron';

const listen = (channel: string) => (callback: (payload: unknown) => void) => {
  const handler = (_event: unknown, payload: unknown) => callback(payload);
  ipcRenderer.on(channel, handler);
  return () => ipcRenderer.removeListener(channel, handler);
};

contextBridge.exposeInMainWorld('host', {
  info: () => ipcRenderer.invoke('app:info'),
  run: (action: string, consent: boolean) => ipcRenderer.invoke('host:run', action, consent),
  cancel: () => ipcRenderer.invoke('host:cancel'),
  readSettings: () => ipcRenderer.invoke('settings:read'),
  writeSettings: (value: unknown) => ipcRenderer.invoke('settings:write', value),
  openExternal: (url: string) => ipcRenderer.invoke('open:external', url),
  openWorkDir: () => ipcRenderer.invoke('open:workdir'),
  exportLog: (text: string) => ipcRenderer.invoke('logs:export', text),
  checkUpdate: () => ipcRenderer.invoke('update:check'),
  restartToUpdate: () => ipcRenderer.invoke('update:restart'),
  windowControl: (what: string) => ipcRenderer.send('window:control', what),
  onOutput: listen('host:output'),
  onDone: listen('host:done'),
  onUpdate: listen('update:state'),
  onMaximized: listen('window:maximized'),
});
