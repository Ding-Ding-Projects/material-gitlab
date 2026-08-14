import { app, BrowserWindow } from 'electron';
import { join } from 'node:path';
import { registerPrivilegedBridge } from './main/bridge';

function createOnboardingWindow(): BrowserWindow {
  const window = new BrowserWindow({
    width: 1180,
    height: 780,
    minWidth: 860,
    minHeight: 620,
    webPreferences: {
      preload: join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });
  void window.loadFile(join(__dirname, 'renderer', 'index.html'));
  return window;
}

app.whenReady().then(() => {
  registerPrivilegedBridge();
  createOnboardingWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createOnboardingWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
