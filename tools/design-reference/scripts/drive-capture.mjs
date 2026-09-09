#!/usr/bin/env node
// Design-parity capture driver.
//
// Drives EITHER side of a design-parity comparison (the internal Electron reference
// renderer, or the real built Rails application) through the Chrome DevTools Protocol
// (CDP) so both captures go through the identical mechanism and land at the identical
// pixel tuple. This script never launches a browser itself: the caller launches the
// target process on the approved cheap Lowlevel headless route (a named hidden desktop)
// with remote debugging enabled, then hands this script the CDP HTTP endpoint.
//
// Deliberate constraints, carried over from verified failure modes on this project:
//   - Runtime.evaluate is never called with awaitPromise: true. On this machine that
//     hangs forever even for trivial expressions on some Node/Electron combinations.
//     Every asynchronous condition on the page is instead observed by polling a
//     synchronous expression from Node, on a bounded interval and timeout.
//   - The CDP target list is required to contain EXACTLY one entry of type "page"
//     before anything else happens. Finding one acceptable target among several proves
//     nothing about isolation; refusing anything but a singleton does.
//   - A password is never interpolated into a Runtime.evaluate expression string (which
//     could otherwise resurface in a CDP trace or an error message). It is typed with
//     Input.insertText after the field is focused, and it is never logged, printed, or
//     written to any output file this script produces.
//
// Usage (reference side):
//   node scripts/drive-capture.mjs --cdp=http://127.0.0.1:9333 --id=surface.issues \
//     --kind=reference --commit=<40-hex sha> --out-dir=<dir>
//
// Usage (built side):
//   node scripts/drive-capture.mjs --cdp=http://127.0.0.1:9333 --id=surface.issues \
//     --kind=built --commit=<40-hex sha> --out-dir=<dir> \
//     --base-url=http://127.0.0.1:3000 --fixture=<fixture.json> \
//     [--sign-in-user=root] [--password-file=<path> | --password-command="<cmd>"] \
//     [--mint-receipt --artifact-manifest=<repo-relative path> --artifact=<repo-relative path>]
//
// Optional --theme, --scale, --width, and --height override the inventory row's own
// tuple for this one run (state and locale are left at the row's value). This is what
// lets design/layout-matrix.json's wider theme/scale/viewport grid for a surface be
// captured through this same driver without a second parity-inventory row per tuple.
//
// See tools/design-reference/README.md for the full option reference and the worked
// rehearsal transcript.

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync, execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { CdpClient, DEFAULT_INTERVAL_MS, DEFAULT_TIMEOUT_MS, evaluateSync, navigateAndSettle, requireSingleTarget, waitForCondition } from './cdp-client.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const DESIGN_REFERENCE_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function parseArgs(argv) {
  const args = {};
  for (const token of argv) {
    if (!token.startsWith('--')) continue;
    const eq = token.indexOf('=');
    if (eq === -1) args[token.slice(2)] = true;
    else args[token.slice(2, eq)] = token.slice(eq + 1);
  }
  return args;
}

function fail(message) {
  const error = new Error(message);
  error.driveCaptureFailure = true;
  throw error;
}

function hashFile(file) {
  return crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
}

function loadInventory() {
  return JSON.parse(fs.readFileSync(path.join(ROOT, 'design', 'parity-inventory.json'), 'utf8'));
}

function rowFor(inventory, id) {
  const row = inventory.contracts.find((candidate) => candidate.id === id);
  if (!row) fail(`unknown inventory row: ${id}`);
  return row;
}

/**
 * Builds the effective capture tuple: the inventory row's own tuple, with an optional
 * per-run override of theme, scale, width, and height. This is what lets the same
 * driver capture design/layout-matrix.json's wider theme/scale/viewport grid for a
 * surface without needing a second inventory row per tuple — "state" and "locale"
 * are deliberately left alone unless explicitly overridden, since neither the parity
 * inventory nor the layout matrix varies them.
 */
export function buildTuple(rowTuple, overrides = {}) {
  const tuple = { ...rowTuple, viewport: { ...rowTuple.viewport } };
  if (overrides.theme) tuple.theme = String(overrides.theme);
  if (overrides.scale) tuple.scale = Number(overrides.scale);
  if (overrides.width) tuple.viewport.width = Number(overrides.width);
  if (overrides.height) tuple.viewport.height = Number(overrides.height);
  if (overrides.locale) tuple.locale = String(overrides.locale);
  if (!['light', 'dark'].includes(tuple.theme)) fail('--theme must be light or dark');
  if (!Number.isFinite(tuple.scale) || tuple.scale <= 0) fail('--scale must be a positive number');
  if (!Number.isInteger(tuple.viewport.width) || tuple.viewport.width <= 0) fail('--width must be a positive integer');
  if (!Number.isInteger(tuple.viewport.height) || tuple.viewport.height <= 0) fail('--height must be a positive integer');
  return tuple;
}

/**
 * Substitutes every ":token" route parameter in a production route (":namespace",
 * ":project", ":id", ":ref", and so on) with the matching value from a small JSON
 * fixture manifest. A route with no ":token" segments (the shared shell, sidebar,
 * command palette, regex builder, and dashboard/todos routes) passes through
 * unchanged and needs no fixture at all. Refuses, rather than guesses, when a
 * required fixture key is missing so a capture can never silently target the
 * wrong project.
 */
export function substituteRoute(route, fixture) {
  return route.replace(/:([A-Za-z_][A-Za-z0-9_]*)/g, (match, key) => {
    const value = fixture ? fixture[key] : undefined;
    if (value === undefined || value === null || value === '') fail(`route ${route} needs fixture key "${key}" (pass --fixture=<path to JSON with a "${key}" field>)`);
    return String(value);
  });
}

function readFixture(value) {
  if (!value) return null;
  const file = path.isAbsolute(value) ? value : path.resolve(process.cwd(), value);
  if (!fs.existsSync(file)) fail(`fixture manifest does not exist: ${value}`);
  const parsed = JSON.parse(fs.readFileSync(file, 'utf8'));
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) fail('fixture manifest must be a JSON object of route-parameter values');
  return parsed;
}

function readPassword(args) {
  if (args['password-file'] && args['password-command']) fail('pass exactly one of --password-file or --password-command, never both');
  if (args['password-file']) {
    const file = path.isAbsolute(args['password-file']) ? args['password-file'] : path.resolve(process.cwd(), args['password-file']);
    if (!fs.existsSync(file)) fail(`password file does not exist: ${args['password-file']}`);
    return fs.readFileSync(file, 'utf8').replace(/(\r\n|\r|\n)+$/, '');
  }
  if (args['password-command']) {
    const output = execSync(String(args['password-command']), { encoding: 'utf8' });
    return output.replace(/(\r\n|\r|\n)+$/, '');
  }
  fail('--sign-in-user requires either --password-file=<path> or --password-command="<command>"');
  return '';
}

function jsString(value) {
  return JSON.stringify(String(value));
}

/**
 * Applies one row.productionActions entry to the currently loaded built page.
 *
 * "preference" writes the shared client-side settings object the same way the
 * product's own settings UI does (tools/design-reference reads this from
 * app/assets/javascripts/material_system/settings.js): merge the requested key into
 * the existing (or default-shaped) settings record under its localStorage key, then
 * dispatch the same "material-system:settings-changed" event the real settings screen
 * dispatches so already-mounted Vue components pick the change up live, with no reload.
 *
 * "click" finds the first candidate control whose computed accessible name matches
 * exactly, using a practical (not full ARIA accname-algorithm) approximation: an
 * explicit aria-label, else aria-labelledby text, else an associated <label>, else the
 * title attribute, else trimmed text content.
 */
async function applyProductionAction(cdp, action) {
  if (action.type === 'preference') {
    const expression = `(() => {
      const STORAGE_KEY = 'material-system.settings.v1';
      const DEFAULTS = { schemaVersion: 1, language: 'en', funnyLevelEnglish: 3, funnyLevelCantonese: 3, showDialogEmojis: true, theme: 'system', density: 'comfortable', accentColor: '#6750A4', fontFamily: 'system-ui', fontScale: 1, motion: 'full', shellVariant: 'b' };
      let current = {};
      try { current = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || '{}') || {}; } catch (error) { current = {}; }
      const next = Object.assign({}, DEFAULTS, current, { [${jsString(action.key)}]: ${jsString(action.value)} });
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      window.dispatchEvent(new Event('material-system:settings-changed'));
      return true;
    })()`;
    const applied = await evaluateSync(cdp, expression);
    if (!applied) fail(`could not apply preference action ${JSON.stringify(action)}`);
    return;
  }
  if (action.type === 'click') {
    const expression = `(() => {
      const name = ${jsString(action.accessibleName)};
      const accessibleName = (el) => {
        const ariaLabel = el.getAttribute && el.getAttribute('aria-label');
        if (ariaLabel && ariaLabel.trim()) return ariaLabel.trim();
        const labelledBy = el.getAttribute && el.getAttribute('aria-labelledby');
        if (labelledBy) {
          const text = labelledBy.split(/\\s+/).map((id) => { const target = document.getElementById(id); return target ? target.textContent.trim() : ''; }).join(' ').trim();
          if (text) return text;
        }
        if (el.labels && el.labels.length) { const text = Array.from(el.labels).map((label) => label.textContent.trim()).join(' ').trim(); if (text) return text; }
        if (el.title && el.title.trim()) return el.title.trim();
        return (el.textContent || '').trim();
      };
      const candidates = document.querySelectorAll('button, [role="button"], a, [role="menuitem"], input[type="button"], input[type="submit"], md-filled-button, md-outlined-button, md-text-button, md-icon-button, md-filled-tonal-button, md-elevated-button, [tabindex]');
      for (const candidate of candidates) {
        if (accessibleName(candidate) === name) { candidate.click(); return true; }
      }
      return false;
    })()`;
    const clicked = await evaluateSync(cdp, expression);
    if (!clicked) fail(`could not find a control with accessible name "${action.accessibleName}" to click`);
    return;
  }
  fail(`unknown productionActions entry type: ${action.type}`);
}

async function signIn(cdp, baseUrl, user, password, { timeoutMs, intervalMs }) {
  await navigateAndSettle(cdp, `${baseUrl.replace(/\/$/, '')}/users/sign_in`);
  const focused = await evaluateSync(cdp, `(() => {
    const login = document.querySelector('#user_login, input[name="user[login]"]');
    const passwordField = document.querySelector('#user_password, input[name="user[password]"]');
    if (!login || !passwordField) return false;
    login.focus();
    login.value = ${jsString(user)};
    login.dispatchEvent(new Event('input', { bubbles: true }));
    login.dispatchEvent(new Event('change', { bubbles: true }));
    passwordField.focus();
    return true;
  })()`);
  if (!focused) fail('could not find the sign-in username/password fields on /users/sign_in');
  // The password itself is typed through Input.insertText into the already-focused
  // field, never interpolated into a Runtime.evaluate expression string, so it never
  // appears in a CDP trace, an error message, or anything this script writes to disk.
  await cdp.send('Input.insertText', { text: password });
  const submitted = await evaluateSync(cdp, `(() => {
    const form = document.querySelector('#user_password, input[name="user[password]"]')?.closest('form');
    const submit = form ? form.querySelector('input[type="submit"], button[type="submit"]') : null;
    if (submit) { submit.click(); return true; }
    if (form) { form.requestSubmit ? form.requestSubmit() : form.submit(); return true; }
    return false;
  })()`);
  if (!submitted) fail('could not submit the sign-in form');
  await waitForCondition(cdp, "location.pathname !== '/users/sign_in'", { timeoutMs, intervalMs, label: 'navigation away from /users/sign_in after sign-in' });
}

function pngDimensions(buffer) {
  if (buffer.length < 24 || buffer.readUInt32BE(0) !== 0x89504e47 || buffer.toString('ascii', 12, 16) !== 'IHDR') fail('captured screenshot is not a valid PNG');
  return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
}

function printReceiptCommand({ id, kind, outDir, commit, artifactManifest, artifact, hasFontProof }) {
  const relativeOutDir = path.relative(ROOT, outDir).replaceAll('\\', '/');
  const pngArg = path.posix.join(relativeOutDir, `${kind}.png`);
  const sessionArg = path.posix.join(relativeOutDir, `${kind}.session.json`);
  const manifestArg = artifactManifest || '<repo-relative artifact manifest path>';
  const artifactArg = artifact || '<repo-relative rendered artifact path>';
  const parts = [
    'node scripts/capture.mjs',
    `--id=${id}`,
    `--kind=${kind}`,
    `--png=${pngArg}`,
    `--commit=${commit}`,
    `--artifact-manifest=${manifestArg}`,
    `--artifact=${artifactArg}`,
    `--session-provenance=${sessionArg}`,
  ];
  if (hasFontProof) parts.push(`--font-proof='<contents of ${path.posix.join(relativeOutDir, `${kind}.font-proof.json`)}>'`);
  console.log('To mint the evidence receipt for this capture, run (from tools/design-reference):');
  console.log(`  ${parts.join(' ')}`);
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const cdpBase = args.cdp;
  const id = args.id;
  const kind = args.kind;
  const commit = args.commit;
  const outDirArg = args['out-dir'];
  if (!cdpBase || !id || !kind || !commit || !outDirArg) fail('usage requires --cdp, --id, --kind=reference|built, --commit, and --out-dir');
  if (!['reference', 'built'].includes(kind)) fail('--kind must be reference or built');
  if (!/^[0-9a-f]{40}$/.test(commit)) fail('--commit must be a full 40-character source commit');
  if (kind === 'built' && !args['base-url']) fail('--kind=built requires --base-url=<instance url>');

  const inventory = loadInventory();
  const row = rowFor(inventory, id);
  const tuple = buildTuple(row.tuple, { theme: args.theme, scale: args.scale, width: args.width, height: args.height, locale: args.locale });
  const outDir = path.isAbsolute(outDirArg) ? outDirArg : path.resolve(process.cwd(), outDirArg);
  fs.mkdirSync(outDir, { recursive: true });

  const timeoutMs = args['timeout-ms'] ? Number(args['timeout-ms']) : DEFAULT_TIMEOUT_MS;
  const intervalMs = args['interval-ms'] ? Number(args['interval-ms']) : DEFAULT_INTERVAL_MS;

  const target = await requireSingleTarget(cdpBase);

  let targetUrl;
  if (kind === 'reference') {
    // The reference app's HTTP server binds an ephemeral port chosen by the operating
    // system, so the exact origin cannot be predicted ahead of time. The origin of the
    // sole live target is trusted (it is loopback-only by construction: the Electron
    // process itself refuses to load anything but 127.0.0.1/localhost), and the full
    // URL is reconstructed against that origin so the path and every query parameter
    // can be checked exactly against the row's tuple rather than merely "looks close".
    const currentUrl = new URL(target.url);
    if (!['127.0.0.1', 'localhost'].includes(currentUrl.hostname)) fail(`reference target is not loopback: ${target.url}`);
    const slug = row.id.replace(/^surface\./, '');
    const expected = new URL(`${currentUrl.origin}/design-reference/${slug}`);
    expected.searchParams.set('state', tuple.state);
    expected.searchParams.set('theme', tuple.theme);
    expected.searchParams.set('scale', String(tuple.scale));
    expected.searchParams.set('locale', tuple.locale);
    // One viewer process serves every reference slug from the same loopback server, so a
    // run over all 25 rows navigates the sole target to each expected URL (the driver's
    // own navigation below) instead of relaunching the viewer per surface. The served
    // page carries the determinism shim on every load and the capture-ready flag is
    // awaited after navigation, so a page that did not settle fails rather than being
    // photographed early. The origin is not allowed to change: that is a different server.
    if (currentUrl.origin !== expected.origin) fail(`reference target origin ${currentUrl.origin} does not match the expected ${expected.origin}; relaunch the reference app on the intended server.`);
    targetUrl = expected.href;
  } else {
    const baseUrl = String(args['base-url']).replace(/\/$/, '');
    const currentOrigin = new URL(target.url).origin;
    if (currentOrigin !== new URL(baseUrl).origin) fail(`built target origin ${currentOrigin} does not match --base-url origin ${new URL(baseUrl).origin}. Launch the isolated browser with --app pointed at --base-url before driving it.`);
    const fixture = readFixture(args.fixture);
    targetUrl = `${baseUrl}${substituteRoute(row.productionRoute, fixture)}`;
  }

  const cdp = new CdpClient(target.webSocketDebuggerUrl);
  try {
    await cdp.connect();
    await cdp.send('Page.enable');

    if (kind === 'built' && args['sign-in-user']) {
      const password = readPassword(args);
      await signIn(cdp, String(args['base-url']), String(args['sign-in-user']), password, { timeoutMs, intervalMs });
    }

    await navigateAndSettle(cdp, targetUrl);
    if (kind === 'reference') {
      const afterNavigation = await evaluateSync(cdp, 'location.href');
      if (afterNavigation !== targetUrl) fail(`reference target URL does not match the expected tuple for ${id} after navigation.\n  expected: ${targetUrl}\n  actual:   ${afterNavigation}`);
    }
    await cdp.send('Emulation.setDeviceMetricsOverride', { width: tuple.viewport.width, height: tuple.viewport.height, deviceScaleFactor: tuple.scale, mobile: false });

    let fontProof = null;
    if (kind === 'reference') {
      await waitForCondition(cdp, 'window.__DESIGN_REFERENCE_CAPTURE_READY__ === true', { timeoutMs, intervalMs, label: 'window.__DESIGN_REFERENCE_CAPTURE_READY__ === true' });
      fontProof = await evaluateSync(cdp, 'JSON.stringify(window.__DESIGN_REFERENCE_FONT_PROOF__ || null)');
      fontProof = fontProof ? JSON.parse(fontProof) : null;
      if (!fontProof) fail('window.__DESIGN_REFERENCE_FONT_PROOF__ was not set once the page reported ready');
    } else {
      await waitForCondition(cdp, "document.fonts.status === 'loaded'", { timeoutMs, intervalMs, label: 'document.fonts.status === "loaded"' });
      for (const action of row.productionActions || []) await applyProductionAction(cdp, action);
      await waitForCondition(cdp, `document.querySelector(${jsString(row.productionMount)}) !== null`, { timeoutMs, intervalMs, label: `document.querySelector(${JSON.stringify(row.productionMount)}) !== null` });
    }

    const userAgent = await evaluateSync(cdp, 'navigator.userAgent');
    const finalUrl = await evaluateSync(cdp, 'location.href');

    const shot = await cdp.send('Page.captureScreenshot', {
      format: 'png',
      clip: { x: 0, y: 0, width: tuple.viewport.width, height: tuple.viewport.height, scale: tuple.scale },
      captureBeyondViewport: false,
    });
    const pngBuffer = Buffer.from(shot.data, 'base64');
    const dimensions = pngDimensions(pngBuffer);
    const expectedWidth = Math.round(tuple.viewport.width * tuple.scale);
    const expectedHeight = Math.round(tuple.viewport.height * tuple.scale);
    if (dimensions.width !== expectedWidth || dimensions.height !== expectedHeight) fail(`captured ${dimensions.width}x${dimensions.height}, expected ${expectedWidth}x${expectedHeight} for tuple viewport ${tuple.viewport.width}x${tuple.viewport.height} at scale ${tuple.scale}`);

    const pngPath = path.join(outDir, `${kind}.png`);
    fs.writeFileSync(pngPath, pngBuffer);

    const cdpUrl = new URL(cdpBase);
    const cdpLabel = `cdp ${cdpUrl.hostname}:${cdpUrl.port || (cdpUrl.protocol === 'https:' ? '443' : '80')}`;
    const session = {
      schemaVersion: 1,
      sourceCommit: commit,
      id,
      kind,
      target: `${finalUrl} via ${cdpLabel}`,
      userAgent,
      timestamp: new Date().toISOString(),
    };
    const sessionPath = path.join(outDir, `${kind}.session.json`);
    fs.writeFileSync(sessionPath, `${JSON.stringify(session, null, 2)}\n`, 'utf8');

    let fontProofPath = null;
    if (kind === 'reference') {
      fontProofPath = path.join(outDir, `${kind}.font-proof.json`);
      fs.writeFileSync(fontProofPath, `${JSON.stringify(fontProof, null, 2)}\n`, 'utf8');
    }

    console.log(JSON.stringify({
      status: 'captured',
      id,
      kind,
      png: pngPath,
      pngSha256: hashFile(pngPath),
      dimensions,
      session: sessionPath,
      fontProof: fontProofPath,
      target: session.target,
    }, null, 2));

    printReceiptCommand({ id, kind, outDir, commit, artifactManifest: args['artifact-manifest'], artifact: args.artifact, hasFontProof: kind === 'reference' });

    if (args['mint-receipt']) {
      if (!args['artifact-manifest'] || !args.artifact) fail('--mint-receipt requires --artifact-manifest and --artifact (repo-relative paths; --out-dir must be inside the repository for this to work)');
      const captureArgs = [
        path.join(DESIGN_REFERENCE_ROOT, 'scripts', 'capture.mjs'),
        `--id=${id}`,
        `--kind=${kind}`,
        `--png=${path.relative(ROOT, pngPath).replaceAll('\\', '/')}`,
        `--commit=${commit}`,
        `--artifact-manifest=${args['artifact-manifest']}`,
        `--artifact=${args.artifact}`,
        `--session-provenance=${path.relative(ROOT, sessionPath).replaceAll('\\', '/')}`,
      ];
      if (kind === 'reference') captureArgs.push(`--font-proof=${JSON.stringify(fontProof)}`);
      console.log('Minting the receipt now (--mint-receipt was passed)...');
      execFileSync(process.execPath, captureArgs, { cwd: DESIGN_REFERENCE_ROOT, stdio: 'inherit' });
    }
  } finally {
    cdp.close();
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(`design-reference-drive-capture: ${error instanceof Error ? error.message : String(error)}`);
    process.exitCode = 1;
  });
}
