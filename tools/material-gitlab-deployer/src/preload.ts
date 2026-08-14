import { contextBridge } from 'electron';

contextBridge.exposeInMainWorld('deployer', {
  version: '0.1.0',
  executionEnabled: false,
});
