// Material GitLab Host: a one-click Windows host for the Material GitLab Docker container.
//
// The window never runs arbitrary commands. It can ask for exactly the host.ps1 commands in
// HOST_ACTIONS, read and write five validated .env settings, open the instance address, and
// check the unsigned Squirrel release feed. Nothing here prints or stores a password or token.
import { app, BrowserWindow, ipcMain, shell, dialog } from 'electron';
import { spawn, spawnSync, type ChildProcess } from 'node:child_process';
import { createHash } from 'node:crypto';
import { createWriteStream, existsSync } from 'node:fs';
import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { basename, dirname, join, resolve } from 'node:path';
import { HOST_ACTIONS, isHostAction, parseHealth, safeExternalUrl, type HostAction } from './core/actions';
import { readSettings, validateSettings, writeSettings } from './core/envFile';
import { isNewer, parseReleases, versionOf } from './core/releases';

const RELEASES_API = 'https://api.github.com/repos/Ding-Ding-Projects/material-gitlab/releases?per_page=30';
const RELEASE_PREFIX = 'material-gitlab-deployer-';

// ---- Squirrel install events -------------------------------------------------------------
// Squirrel launches the app with these flags during install, update and uninstall. Shortcuts
// go through Update.exe; the app then quits without opening a window.
function handleSquirrelEvent(): boolean {
  if (process.platform !== 'win32') return false;
  const flag = process.argv[1];
  if (!flag || !flag.startsWith('--squirrel-')) return false;
  const updateExe = resolve(dirname(process.execPath), '..', 'Update.exe');
  const exe = basename(process.execPath);
  const run = (args: string[]) => {
    try {
      spawn(updateExe, args, { detached: true, stdio: 'ignore', windowsHide: true }).unref();
    } catch {
      /* Shortcuts are a convenience; installation still succeeds. */
    }
  };
  if (flag === '--squirrel-install' || flag === '--squirrel-updated') run(['--createShortcut', exe]);
  else if (flag === '--squirrel-uninstall') run(['--removeShortcut', exe]);
  setTimeout(() => app.quit(), 1000);
  return true;
}

if (handleSquirrelEvent()) {
  // Nothing else runs during a Squirrel event.
} else if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  start();
}

// ---- Host files ----------------------------------------------------------------------------
// The packaged app carries deploy\windows, deploy\docker and docker-compose.yml. They are
// copied to %LOCALAPPDATA%\MaterialGitLabHost on every launch so an update brings new scripts,
// while .env (the user's settings) is never copied over or removed.
function bundledHostDir(): string {
  return app.isPackaged ? join(process.resourcesPath, 'host') : resolve(__dirname, '..', '..', '..');
}

function workDir(): string {
  const base = process.env.LOCALAPPDATA || app.getPath('userData');
  return join(base, 'MaterialGitLabHost');
}

async function syncHostFiles(): Promise<string> {
  const source = bundledHostDir();
  const target = workDir();
  await mkdir(join(target, 'deploy'), { recursive: true });
  await cp(join(source, 'docker-compose.yml'), join(target, 'docker-compose.yml'));
  for (const part of ['windows', 'docker']) {
    const to = join(target, 'deploy', part);
    await rm(to, { recursive: true, force: true });
    await cp(join(source, 'deploy', part), to, {
      recursive: true,
      filter: (path) => !/[\\/]packages[\\/].+\.deb$/i.test(path),
    });
  }
  return target;
}

// ---- Running host.ps1 ---------------------------------------------------------------------
let running: { action: HostAction; child: ChildProcess } | null = null;

function runHost(window: BrowserWindow, action: HostAction, consent: boolean): Promise<{ code: number; output: string }> {
  return new Promise((done) => {
    const root = workDir();
    const script = join(root, 'deploy', 'windows', 'host.ps1');
    const env: NodeJS.ProcessEnv = {
      ...process.env,
      MATERIAL_GITLAB_HOST_ROOT: root,
      MATERIAL_GITLAB_NO_BROWSER: '1',
      SILENT: consent ? '' : '1',
    };
    if (consent) env.MATERIAL_GITLAB_ASSUME_YES = '1';
    else delete env.MATERIAL_GITLAB_ASSUME_YES;
    const child = spawn(
      'powershell.exe',
      ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-File', script, HOST_ACTIONS[action]],
      { cwd: root, env, windowsHide: true },
    );
    running = { action, child };
    let output = '';
    const send = (chunk: Buffer) => {
      const text = chunk.toString('utf8');
      output += text;
      if (!window.isDestroyed()) window.webContents.send('host:output', { action, text });
    };
    child.stdout.on('data', send);
    child.stderr.on('data', send);
    child.on('error', (error) => {
      send(Buffer.from(`\nCould not start PowerShell: ${error.message}\n`));
    });
    child.on('close', (code) => {
      running = null;
      const result = { code: code ?? 1, output };
      if (!window.isDestroyed()) window.webContents.send('host:done', { action, code: result.code });
      done(result);
    });
  });
}

// ---- Updates -------------------------------------------------------------------------------
// Downloads the published RELEASES index and full package, checks the SHA-1 the index names,
// then lets Squirrel's Update.exe apply it. The installer and packages are unsigned; the window
// says so plainly and only offers a restart once the package hash matched.
type UpdateState =
  | { state: 'idle' | 'checking' | 'current' | 'unavailable'; detail?: string }
  | { state: 'ready'; version: string };
let updateState: UpdateState = { state: 'idle' };

async function fetchBuffer(url: string, timeoutMs = 30000): Promise<Buffer> {
  const response = await fetch(url, { redirect: 'follow', signal: AbortSignal.timeout(timeoutMs) });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return Buffer.from(await response.arrayBuffer());
}

// The repository publishes several kinds of release (Omnibus packages, Windows apps), so the
// newest release is not necessarily one that carries this app. Find the newest that does.
type ReleaseAsset = { name: string; browser_download_url: string };
async function findFeed(): Promise<Map<string, string> | null> {
  const releases = JSON.parse((await fetchBuffer(RELEASES_API)).toString('utf8')) as Array<{
    draft: boolean;
    prerelease: boolean;
    assets: ReleaseAsset[];
  }>;
  for (const release of releases) {
    if (release.draft || release.prerelease) continue;
    const assets = new Map(release.assets.map((asset) => [asset.name, asset.browser_download_url]));
    if (assets.has(`${RELEASE_PREFIX}RELEASES`)) return assets;
  }
  return null;
}

async function checkForUpdate(window: BrowserWindow | null): Promise<UpdateState> {
  const report = (next: UpdateState) => {
    updateState = next;
    if (window && !window.isDestroyed()) window.webContents.send('update:state', next);
    return next;
  };
  if (!app.isPackaged || process.platform !== 'win32') return report({ state: 'unavailable', detail: 'dev' });
  report({ state: 'checking' });
  try {
    const feed = await findFeed();
    if (!feed) return report({ state: 'unavailable', detail: 'feed' });
    const index = parseReleases((await fetchBuffer(feed.get(`${RELEASE_PREFIX}RELEASES`) as string)).toString('utf8'));
    const full = index.filter((entry) => /-full\.nupkg$/.test(entry.file)).pop();
    const version = full && versionOf(full.file);
    if (!full || !version) return report({ state: 'unavailable', detail: 'feed' });
    if (!isNewer(version, app.getVersion())) return report({ state: 'current' });
    const dir = join(app.getPath('temp'), 'material-gitlab-host-update');
    await rm(dir, { recursive: true, force: true });
    await mkdir(dir, { recursive: true });
    const pkgUrl = feed.get(`${RELEASE_PREFIX}${full.file}`);
    if (!pkgUrl) return report({ state: 'unavailable', detail: 'feed' });
    const pkg = await fetchBuffer(pkgUrl, 10 * 60 * 1000);
    const sha1 = createHash('sha1').update(pkg).digest('hex').toUpperCase();
    if (sha1 !== full.sha1 || pkg.length !== full.size) return report({ state: 'unavailable', detail: 'hash' });
    await writeFile(join(dir, full.file), pkg);
    await writeFile(join(dir, 'RELEASES'), `${full.sha1} ${full.file} ${full.size}\r\n`);
    const updateExe = resolve(dirname(process.execPath), '..', 'Update.exe');
    const result = spawnSync(updateExe, ['--update', dir], { windowsHide: true });
    if (result.status !== 0) return report({ state: 'unavailable', detail: 'apply' });
    return report({ state: 'ready', version });
  } catch {
    return report({ state: 'unavailable', detail: 'network' });
  }
}

// ---- Window --------------------------------------------------------------------------------
function createWindow(): BrowserWindow {
  const window = new BrowserWindow({
    width: 1240,
    height: 820,
    minWidth: 760,
    minHeight: 560,
    frame: false,
    titleBarStyle: 'hidden',
    backgroundColor: '#fbf6ee',
    show: false,
    icon: join(__dirname, 'renderer', 'icon.png'),
    webPreferences: {
      preload: join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });
  window.once('ready-to-show', () => window.show());
  window.webContents.setWindowOpenHandler(({ url }) => {
    const safe = safeExternalUrl(url);
    if (safe) void shell.openExternal(safe);
    return { action: 'deny' };
  });
  window.webContents.on('will-navigate', (event) => event.preventDefault());
  const sendMax = () => window.webContents.send('window:maximized', window.isMaximized());
  window.on('maximize', sendMax);
  window.on('unmaximize', sendMax);
  void window.loadFile(join(__dirname, 'renderer', 'index.html'));
  return window;
}

function registerIpc(getWindow: () => BrowserWindow | null): void {
  const envPath = () => join(workDir(), '.env');

  ipcMain.handle('app:info', () => ({
    version: app.getVersion(),
    platform: process.platform,
    workDir: workDir(),
    hasEnv: existsSync(envPath()),
    running: running?.action ?? null,
    update: updateState,
  }));

  ipcMain.handle('host:run', async (_event, action: unknown, consent: unknown) => {
    const window = getWindow();
    if (!window) return { ok: false, error: 'window' };
    if (!isHostAction(action)) return { ok: false, error: 'action' };
    if (process.platform !== 'win32') return { ok: false, error: 'platform' };
    if (running) return { ok: false, error: 'busy' };
    const result = await runHost(window, action, consent === true);
    const health = action === 'health' ? parseHealth(result.output) : undefined;
    return { ok: result.code === 0, code: result.code, health };
  });

  ipcMain.handle('host:cancel', () => {
    if (!running) return false;
    // Stops the PowerShell process tree. Docker keeps whatever state it already reached;
    // nothing is deleted.
    spawnSync('taskkill', ['/PID', String(running.child.pid), '/T', '/F'], { windowsHide: true });
    return true;
  });

  ipcMain.handle('settings:read', async () => {
    if (!existsSync(envPath())) return { exists: false };
    return { exists: true, value: readSettings(await readFile(envPath(), 'utf8')) };
  });

  ipcMain.handle('settings:write', async (_event, input: unknown) => {
    const checked = validateSettings(input);
    if (!checked.ok) return checked;
    if (!existsSync(envPath())) return { ok: false, errors: ['noEnv'] };
    const before = await readFile(envPath(), 'utf8');
    await writeFile(envPath(), writeSettings(before, checked.value), 'utf8');
    return { ok: true };
  });

  ipcMain.handle('open:external', (_event, url: unknown) => {
    const safe = safeExternalUrl(url);
    if (!safe) return false;
    void shell.openExternal(safe);
    return true;
  });

  ipcMain.handle('open:workdir', () => shell.openPath(workDir()));

  ipcMain.handle('logs:export', async (_event, text: unknown) => {
    const window = getWindow();
    if (!window || typeof text !== 'string') return false;
    const choice = await dialog.showSaveDialog(window, {
      defaultPath: `material-gitlab-host-log-${new Date().toISOString().slice(0, 10)}.txt`,
      filters: [{ name: 'Text', extensions: ['txt'] }],
    });
    if (choice.canceled || !choice.filePath) return false;
    await new Promise<void>((done, fail) => {
      const out = createWriteStream(choice.filePath as string);
      out.on('error', fail);
      out.end(text, () => done());
    });
    return true;
  });

  ipcMain.handle('update:check', () => checkForUpdate(getWindow()));
  ipcMain.handle('update:restart', () => {
    if (updateState.state !== 'ready' || !app.isPackaged) return false;
    const updateExe = resolve(dirname(process.execPath), '..', 'Update.exe');
    spawn(updateExe, ['--processStartAndWait', basename(process.execPath)], { detached: true, stdio: 'ignore' }).unref();
    app.quit();
    return true;
  });

  ipcMain.on('window:control', (_event, what: unknown) => {
    const window = getWindow();
    if (!window) return;
    if (what === 'minimize') window.minimize();
    else if (what === 'maximize') (window.isMaximized() ? window.unmaximize() : window.maximize());
    else if (what === 'close') window.close();
  });
}

function start(): void {
  let mainWindow: BrowserWindow | null = null;
  app.on('second-instance', () => {
    if (!mainWindow) return;
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.focus();
  });
  app.whenReady().then(async () => {
    registerIpc(() => mainWindow);
    try {
      await syncHostFiles();
    } catch (error) {
      dialog.showErrorBox('Material GitLab Host', `Could not prepare the host files: ${(error as Error).message}`);
    }
    mainWindow = createWindow();
    mainWindow.on('closed', () => {
      mainWindow = null;
    });
    // Background update check after the window is up, then every six hours.
    setTimeout(() => void checkForUpdate(mainWindow), 15000);
    setInterval(() => void checkForUpdate(mainWindow), 6 * 60 * 60 * 1000);
  });
  app.on('window-all-closed', () => app.quit());
}
