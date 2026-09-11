// Minimal Chrome DevTools Protocol (CDP) client shared by drive-capture.mjs and
// layout-probe.mjs, so both scripts prove target isolation and evaluate page state the
// same way. Uses only the platform's global fetch and WebSocket (Node >= 22); no
// dependency is added for this.
//
// Deliberately never calls Runtime.evaluate with awaitPromise: true. On this project's
// development machine that hangs indefinitely even for trivial expressions on some
// Node/Electron/Chromium combinations. Every asynchronous page condition is instead
// observed by polling a synchronous expression from Node on a bounded interval and
// timeout (see waitForCondition below).

export const DEFAULT_TIMEOUT_MS = 30000;
export const DEFAULT_INTERVAL_MS = 200;

export function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export class CdpClient {
  constructor(webSocketDebuggerUrl) {
    this.url = webSocketDebuggerUrl;
    this.nextId = 1;
    this.pending = new Map();
    this.socket = null;
  }

  async connect() {
    this.socket = new WebSocket(this.url);
    await new Promise((resolve, reject) => {
      const onOpen = () => { cleanup(); resolve(); };
      const onError = () => { cleanup(); reject(new Error(`could not open a CDP WebSocket to ${this.url}`)); };
      const cleanup = () => { this.socket.removeEventListener('open', onOpen); this.socket.removeEventListener('error', onError); };
      this.socket.addEventListener('open', onOpen);
      this.socket.addEventListener('error', onError);
    });
    this.socket.addEventListener('message', (event) => this.onMessage(event));
    this.socket.addEventListener('error', () => {});
  }

  onMessage(event) {
    let message;
    try { message = JSON.parse(typeof event.data === 'string' ? event.data : event.data.toString()); }
    catch { return; }
    if (message.id !== undefined && this.pending.has(message.id)) {
      const { resolve, reject } = this.pending.get(message.id);
      this.pending.delete(message.id);
      if (message.error) reject(new Error(`CDP ${message.error.code ?? ''} ${message.error.message ?? 'unknown CDP error'}`.trim()));
      else resolve(message.result);
    }
  }

  send(method, params = {}) {
    const id = this.nextId += 1;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.socket.send(JSON.stringify({ id, method, params }));
    });
  }

  close() {
    try { this.socket?.close(); } catch { /* already closed */ }
  }
}

/**
 * Reads the CDP target list from a debugging endpoint and refuses anything but exactly
 * one target of type "page". Finding one acceptable target among several proves nothing
 * about isolation: an extra target is exactly what a restored tab, a synced extension,
 * or a second launched instance looks like, so the whole list is refused rather than
 * the "obviously right" entry silently picked.
 */
export async function requireSingleTarget(cdpBase) {
  const response = await fetch(`${cdpBase.replace(/\/$/, '')}/json/list`);
  if (!response.ok) throw new Error(`could not read the CDP target list from ${cdpBase}: HTTP ${response.status}`);
  const targets = await response.json();
  if (!Array.isArray(targets)) throw new Error('CDP target list did not return an array');
  const pages = targets.filter((target) => target.type === 'page');
  if (targets.length !== 1 || pages.length !== 1) {
    throw new Error(`expected exactly one CDP page target, found ${targets.length} target(s) (${targets.map((target) => `${target.type}:${target.url}`).join(', ') || 'none'}). Finding one acceptable target among several proves nothing about isolation; close every other target before proceeding.`);
  }
  const [target] = pages;
  if (!target.webSocketDebuggerUrl) throw new Error('the sole CDP page target has no webSocketDebuggerUrl; devtools may already be attached elsewhere');
  return target;
}

/** Evaluates a synchronous expression in the page and returns its value by value. Never awaits a promise on the page side. */
export async function evaluateSync(cdp, expression) {
  const result = await cdp.send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: false });
  if (result?.exceptionDetails) throw new Error(`page-side evaluation threw: ${result.exceptionDetails.text || result.exceptionDetails.exception?.description || 'unknown error'}`);
  return result?.result?.value;
}

/** Polls a synchronous boolean-ish expression until it is truthy, or fails after timeoutMs. */
export async function waitForCondition(cdp, expression, { timeoutMs = DEFAULT_TIMEOUT_MS, intervalMs = DEFAULT_INTERVAL_MS, label = expression } = {}) {
  const deadline = Date.now() + timeoutMs;
  for (;;) {
    const value = await evaluateSync(cdp, expression);
    if (value) return value;
    if (Date.now() >= deadline) throw new Error(`timed out after ${timeoutMs}ms waiting for: ${label}`);
    await sleep(intervalMs);
  }
}

export async function navigateAndSettle(cdp, url, options = {}) {
  await cdp.send('Page.enable');
  await cdp.send('Page.navigate', { url });
  await waitForCondition(cdp, "document.readyState === 'complete'", { ...options, label: options.label || `document.readyState === "complete" at ${url}` });
}
