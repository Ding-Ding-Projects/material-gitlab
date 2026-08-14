import { app, BrowserWindow, ipcMain } from 'electron';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { createLifecycleBoundaryApi } from './shared/lifecycle-boundary';

const lifecycleApi = createLifecycleBoundaryApi({
  commandAvailable: (command) => {
    // Local capability discovery only. This never starts Docker, WSL, or SSH.
    try {
      return spawnSync('where.exe', [command], { stdio: 'ignore', windowsHide: true }).status === 0;
    } catch {
      return false;
    }
  },
});

function registerLifecycleIpc(): void {
  ipcMain.handle('deployer:lifecycle:preflight', (_event, input: unknown) => {
    try { return { ok: true, value: lifecycleApi.preflight(input) }; }
    catch (error) { return { ok: false, error: error instanceof Error ? error.message : 'Invalid deployment configuration.' }; }
  });
  ipcMain.handle('deployer:lifecycle:doctor', (_event, input: unknown) => {
    try { return { ok: true, value: lifecycleApi.doctor(input) }; }
    catch (error) { return { ok: false, error: error instanceof Error ? error.message : 'Invalid deployment configuration.' }; }
  });
  ipcMain.handle('deployer:lifecycle:plan', (_event, input: unknown) => {
    try { return { ok: true, value: lifecycleApi.plan(input) }; }
    catch (error) { return { ok: false, error: error instanceof Error ? error.message : 'Invalid deployment configuration.' }; }
  });
}

function createWindow(): void {
  const window = new BrowserWindow({
    width: 1180,
    height: 780,
    minWidth: 860,
    minHeight: 620,
    backgroundColor: '#f7f8fc',
    webPreferences: { preload: join(__dirname, 'preload.js'), contextIsolation: true, nodeIntegration: false },
  });
  void window.loadFile(join(__dirname, 'renderer', 'index.html'));
}

app.whenReady().then(() => {
  registerLifecycleIpc();
  createWindow();
  app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
});
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
