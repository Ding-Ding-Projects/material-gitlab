const { app, BrowserWindow, session } = require('electron');
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const ROOT = path.resolve(__dirname, '..', '..', '..');
const DESIGN_ROOT = path.join(ROOT, 'design');
const INVENTORY_PATH = path.join(DESIGN_ROOT, 'parity-inventory.json');
const inventory = JSON.parse(fs.readFileSync(INVENTORY_PATH, 'utf8'));
const contracts = new Map(inventory.contracts.map((row) => [row.id.replace(/^surface\./, ''), row]));
const LOCAL_HOSTS = new Set(['127.0.0.1', 'localhost']);
let server;

function fail(message) {
  throw new Error(`design-reference: ${message}`);
}

function json(res, status, value) {
  const body = JSON.stringify(value, null, 2);
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' });
  res.end(body);
}

function mime(file) {
  return ({
    '.html': 'text/html; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.svg': 'image/svg+xml',
    '.css': 'text/css; charset=utf-8',
    '.png': 'image/png',
  })[path.extname(file).toLowerCase()] || 'application/octet-stream';
}

function safeFile(root, requestPath) {
  const decoded = decodeURIComponent(requestPath);
  const candidate = path.resolve(root, decoded.replace(/^\/+/, ''));
  if (candidate !== root && !candidate.startsWith(`${root}${path.sep}`)) fail('path traversal rejected');
  return candidate;
}

function freezeScript(tuple) {
  const serialized = JSON.stringify(tuple);
  return `<script data-design-reference-determinism>(function(){\n` +
    `const tuple=${serialized}; window.__DESIGN_REFERENCE_TUPLE__=tuple;\n` +
    `const fixedMs=Date.parse(tuple.deterministic.time); const NativeDate=Date;\n` +
    `class FrozenDate extends NativeDate { constructor(...a){ super(a.length ? a[0] : fixedMs); } static now(){ return fixedMs; } }\n` +
    `window.Date=FrozenDate; let seed=tuple.deterministic.randomSeed>>>0; Math.random=()=>((seed=(1664525*seed+1013904223)>>>0)/4294967296);\n` +
    `const nativeFetch=window.fetch.bind(window); window.fetch=(input,init)=>{ const u=new URL(typeof input==='string'?input:input.url,location.href); if(u.origin!==location.origin) return Promise.reject(new Error('External network blocked by design-reference policy')); return nativeFetch(input,init); };\n` +
    `const style=document.createElement('style'); style.textContent='*,*::before,*::after{animation:none!important;transition:none!important;caret-color:transparent!important}'; document.documentElement.appendChild(style);\n` +
    `document.addEventListener('DOMContentLoaded',()=>{ if(tuple.theme==='dark') document.body.classList.add('dark'); document.documentElement.dataset.designReferenceTheme=tuple.theme; document.documentElement.dataset.designReferenceState=tuple.state; });\n` +
    `})();</script>`;
}

function transformDesign(source, row, tuple) {
  const reactPath = '/vendor/react.production.min.js';
  const reactDomPath = '/vendor/react-dom.production.min.js';
  const localFonts = `<style data-design-reference-fonts>@font-face{font-family:'Material Symbols Outlined';font-style:normal;font-weight:100 700;src:url('/vendor/material-symbols-outlined.woff2') format('woff2')}.material-symbols-outlined{font-family:'Material Symbols Outlined';font-weight:normal;font-style:normal;line-height:1;letter-spacing:normal;text-transform:none;display:inline-block;white-space:nowrap;word-wrap:normal;direction:ltr;font-feature-settings:'liga';-webkit-font-feature-settings:'liga';-webkit-font-smoothing:antialiased}</style>`;
  const injection = `<base href="/design/"><script src="${reactPath}"></script><script src="${reactDomPath}"></script>${localFonts}${freezeScript({ ...row, tuple, deterministic: row.deterministic })}`;
  return source.replace(/<head>/i, `<head>${injection}`);
}

function serveDesign(res, row, tuple) {
  const file = safeFile(ROOT, row.referenceFile);
  if (!fs.existsSync(file)) return json(res, 404, { error: 'reference file missing', referenceFile: row.referenceFile });
  const source = fs.readFileSync(file, 'utf8');
  const body = transformDesign(source, row, tuple);
  res.writeHead(200, { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store', 'x-design-reference-file': row.referenceFile, 'x-design-reference-sha256': crypto.createHash('sha256').update(source).digest('hex') });
  res.end(body);
}

function parseTuple(row, url) {
  const tuple = JSON.parse(JSON.stringify(row.tuple));
  const state = url.searchParams.get('state');
  const theme = url.searchParams.get('theme');
  const locale = url.searchParams.get('locale');
  const scale = url.searchParams.get('scale');
  if (state) tuple.state = state;
  if (theme) tuple.theme = theme;
  if (locale) tuple.locale = locale;
  if (scale) tuple.scale = Number(scale);
  if (!['light', 'dark'].includes(tuple.theme)) fail('theme must be light or dark');
  if (!Number.isFinite(tuple.scale) || tuple.scale <= 0) fail('scale must be a positive number');
  return tuple;
}

function startServer() {
  return new Promise((resolve) => {
    server = http.createServer((req, res) => {
      try {
        const url = new URL(req.url, 'http://127.0.0.1');
        if (url.pathname === '/health') return json(res, 200, { ok: true, app: 'material-gitlab-design-reference', contracts: contracts.size, network: 'deny-external' });
        if (url.pathname.startsWith('/design-reference/')) {
          const slug = url.pathname.slice('/design-reference/'.length).replace(/\/$/, '');
          const row = contracts.get(slug);
          if (!row) return json(res, 404, { error: 'unknown stable surface route', route: url.pathname });
          const tuple = parseTuple(row, url);
          return serveDesign(res, row, tuple);
        }
        if (url.pathname.startsWith('/design/')) {
          const file = safeFile(ROOT, url.pathname);
          if (!fs.existsSync(file) || !fs.statSync(file).isFile()) return json(res, 404, { error: 'design asset not found' });
          res.writeHead(200, { 'content-type': mime(file), 'cache-control': 'no-store' });
          return fs.createReadStream(file).pipe(res);
        }
        if (url.pathname === '/vendor/react.production.min.js' || url.pathname === '/vendor/react-dom.production.min.js') {
          const packageName = url.pathname.includes('react-dom') ? 'react-dom' : 'react';
          const packageRoot = path.dirname(require.resolve(`${packageName}/package.json`));
          const file = path.join(packageRoot, 'umd', url.pathname.split('/').pop());
          if (!fs.existsSync(file)) return json(res, 404, { error: `missing bundled ${packageName} UMD runtime`, file });
          res.writeHead(200, { 'content-type': 'text/javascript; charset=utf-8', 'cache-control': 'no-store' });
          return fs.createReadStream(file).pipe(res);
        }
        if (url.pathname === '/vendor/material-symbols-outlined.woff2') {
          const packageRoot = path.dirname(require.resolve('material-symbols/package.json'));
          const file = path.join(packageRoot, 'material-symbols-outlined.woff2');
          if (!fs.existsSync(file)) return json(res, 404, { error: 'missing bundled Material Symbols font' });
          res.writeHead(200, { 'content-type': 'font/woff2', 'cache-control': 'no-store' });
          return fs.createReadStream(file).pipe(res);
        }
        return json(res, 404, { error: 'not found' });
      } catch (error) {
        return json(res, 400, { error: error instanceof Error ? error.message : String(error) });
      }
    });
    server.listen(0, '127.0.0.1', () => resolve(server.address().port));
  });
}

function cliOptions() {
  const args = process.argv.slice(1);
  const result = { surface: 'admin', state: 'default', theme: 'light', scale: 1, width: 1280, height: 800, locale: 'en-US' };
  for (const arg of args) {
    const [key, value] = arg.split('=', 2);
    if (key === '--surface' && value) result.surface = value;
    if (key === '--state' && value) result.state = value;
    if (key === '--theme' && value) result.theme = value;
    if (key === '--scale' && value) result.scale = Number(value);
    if (key === '--width' && value) result.width = Number(value);
    if (key === '--height' && value) result.height = Number(value);
    if (key === '--locale' && value) result.locale = value;
  }
  return result;
}

async function createWindow(port) {
  const options = cliOptions();
  if (!contracts.has(options.surface)) fail(`unknown surface '${options.surface}'`);
  const partition = `design-reference-${process.pid}`;
  const ses = session.fromPartition(partition);
  ses.webRequest.onBeforeRequest({ urls: ['*://*/*'] }, (details, callback) => {
    try {
      const host = new URL(details.url).hostname;
      callback({ cancel: !LOCAL_HOSTS.has(host) });
    } catch { callback({ cancel: true }); }
  });
  const window = new BrowserWindow({
    width: options.width,
    height: options.height,
    minWidth: 640,
    minHeight: 480,
    title: 'GitLab design reference',
    frame: false,
    autoHideMenuBar: true,
    backgroundColor: options.theme === 'dark' ? '#141218' : '#f4effa',
    webPreferences: { partition, contextIsolation: true, nodeIntegration: false, backgroundThrottling: false, sandbox: true },
  });
  const url = new URL(`http://127.0.0.1:${port}/design-reference/${options.surface}`);
  url.searchParams.set('state', options.state); url.searchParams.set('theme', options.theme); url.searchParams.set('scale', String(options.scale)); url.searchParams.set('locale', options.locale);
  await window.loadURL(url.toString());
  return window;
}

app.whenReady().then(async () => {
  const port = await startServer();
  await createWindow(port);
  app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) void createWindow(port); });
});

app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
app.on('will-quit', () => { server?.close(); });
