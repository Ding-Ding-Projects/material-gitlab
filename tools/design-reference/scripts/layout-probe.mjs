#!/usr/bin/env node
// Design-parity layout probe.
//
// Connects to an ALREADY-LOADED page (the same CDP session drive-capture.mjs just used,
// or a fresh connection to the same still-open target) and looks for clipping
// candidates: an element whose content overflows its own scroll box, a host element
// whose box exceeds its parent's box, and a run of text whose own laid-out range
// exceeds the box that is supposed to contain it. It never navigates the page — doing
// so would discard whatever state drive-capture.mjs (or a human) put the page into,
// such as an opened command-palette overlay from a built-side productionActions click.
//
// Scope, exactly as specified for this lane:
//   - every registered Material host: any custom element whose tag name starts with
//     "md-" (md-filled-button, md-outlined-text-field, and so on — see
//     app/assets/javascripts/material_system/components/register.js for the full set
//     this project registers);
//   - every element inside "the shell": <nav>, <header>, [role="toolbar"], and what
//     this probe treats as "the search field containers" — input[type="search"],
//     [role="search"], and anything whose class list contains "search" or "regex"
//     (case-insensitive), which is how this project's search bars and their adjacent
//     regex-builder affordances are named. This is a heuristic, not a registry; widen
//     SHELL_SELECTOR below if a surface names its search container something else.
//
// Only md-* hosts get their computed width/height/padding recorded (the deliverable's
// "which CSS rule wins ... (getComputedStyle values)" — getComputedStyle IS the record
// of which rule won the cascade, expressed as the resolved value rather than a
// selector). Plain shell elements that are not themselves md-* hosts record
// computed: null.
//
// A "finding" is a clipping CANDIDATE, not a proven defect: a control that
// intentionally scrolls its own content (a long list, a code block) will legitimately
// have scrollHeight > clientHeight. Reviewing findings against the surface's actual
// design intent is a human or a later lane's job; this probe's job is to never miss
// one silently. Zero findings is a real, reportable result, not an absence of effort.
//
// Usage:
//   node scripts/layout-probe.mjs --cdp=http://127.0.0.1:9333 --id=surface.issues \
//     --kind=reference --commit=<40-hex sha> --out-dir=<dir>

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { CdpClient, requireSingleTarget } from './cdp-client.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const EPSILON_PX = 0.5;

/**
 * Approximates "the shell" for the purpose of this probe. See the file header for why
 * this is a heuristic rather than a registry lookup, and where to widen it.
 */
export const SHELL_SELECTOR = 'nav, header, [role="toolbar"], input[type="search"], [role="search"], [class*="search" i], [class*="regex" i]';

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
  throw new Error(message);
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
 * Runs INSIDE the page over Runtime.evaluate via Function.prototype.toString(). Kept
 * as an ordinary top-level function (rather than a template-literal string built by
 * hand) specifically so its body is never escaped, re-escaped, or accidentally
 * mangled by a nested quoting layer — every JS string literal and regex below is
 * exactly what runs in the browser, byte for byte, with no manual escaping between
 * here and there.
 *
 * @param {{shellSelector: string, epsilon: number}} options
 */
function browserLayoutProbe({ shellSelector, epsilon }) {
  const isMdHost = (el) => typeof el.tagName === 'string' && el.tagName.toLowerCase().startsWith('md-');

  const rectOf = (rect) => ({ x: rect.x, y: rect.y, width: rect.width, height: rect.height, top: rect.top, right: rect.right, bottom: rect.bottom, left: rect.left });

  const exceeds = (rect, containerRect) => (
    rect.right > containerRect.right + epsilon
    || rect.bottom > containerRect.bottom + epsilon
    || rect.left < containerRect.left - epsilon
    || rect.top < containerRect.top - epsilon
  );

  const computedFor = (el) => {
    const style = getComputedStyle(el);
    return {
      width: style.width,
      height: style.height,
      paddingTop: style.paddingTop,
      paddingRight: style.paddingRight,
      paddingBottom: style.paddingBottom,
      paddingLeft: style.paddingLeft,
    };
  };

  const cssPath = (element, maxDepth) => {
    const parts = [];
    let node = element;
    let depth = 0;
    while (node && node.nodeType === 1 && depth < maxDepth) {
      let part = node.tagName.toLowerCase();
      if (node.id) {
        parts.unshift(`${part}#${node.id}`);
        break;
      }
      const classNameValue = typeof node.className === 'string' ? node.className : '';
      const classes = classNameValue.trim().length ? classNameValue.trim().split(/\s+/).slice(0, 3) : [];
      if (classes.length) part += `.${classes.join('.')}`;
      const parent = node.parentElement;
      if (parent) {
        const siblingsOfSameTag = Array.from(parent.children).filter((sibling) => sibling.tagName === node.tagName);
        if (siblingsOfSameTag.length > 1) part += `:nth-of-type(${siblingsOfSameTag.indexOf(node) + 1})`;
      }
      parts.unshift(part);
      node = parent;
      depth += 1;
    }
    return parts.join(' > ');
  };

  const allElements = Array.from(document.querySelectorAll('*'));
  const mdHosts = allElements.filter(isMdHost);
  const shellElements = Array.from(document.querySelectorAll(shellSelector));
  const candidates = Array.from(new Set([...mdHosts, ...shellElements]));

  const findings = [];

  for (const element of candidates) {
    const rect = element.getBoundingClientRect();
    if (rect.width === 0 && rect.height === 0) continue; // not rendered; cannot be clipping anything
    const selector = cssPath(element, 6);
    const md = isMdHost(element);
    const computed = md ? computedFor(element) : null;

    if (element.clientWidth > 0 && element.scrollWidth - element.clientWidth > epsilon) {
      findings.push({ selector, kind: 'horizontal-scroll-overflow', rect: rectOf(rect), parentRect: null, computed, detail: { scrollWidth: element.scrollWidth, clientWidth: element.clientWidth } });
    }
    if (element.clientHeight > 0 && element.scrollHeight - element.clientHeight > epsilon) {
      findings.push({ selector, kind: 'vertical-scroll-overflow', rect: rectOf(rect), parentRect: null, computed, detail: { scrollHeight: element.scrollHeight, clientHeight: element.clientHeight } });
    }

    const parent = element.parentElement;
    if (parent) {
      const parentRect = parent.getBoundingClientRect();
      if ((parentRect.width > 0 || parentRect.height > 0) && exceeds(rect, parentRect)) {
        findings.push({ selector, kind: 'host-exceeds-parent', rect: rectOf(rect), parentRect: rectOf(parentRect), computed });
      }
    }

    for (const child of Array.from(element.childNodes)) {
      if (child.nodeType !== 3) continue; // Node.TEXT_NODE
      const text = (child.textContent || '').trim();
      if (!text) continue;
      const range = document.createRange();
      range.selectNodeContents(child);
      let flaggedThisNode = false;
      for (const textRect of Array.from(range.getClientRects())) {
        if (textRect.width === 0 && textRect.height === 0) continue;
        if (exceeds(textRect, rect)) {
          findings.push({ selector, kind: 'text-exceeds-container', rect: rectOf(textRect), parentRect: rectOf(rect), computed, detail: { text: text.slice(0, 80) } });
          flaggedThisNode = true;
          break;
        }
      }
      if (flaggedThisNode) continue;
    }
  }

  return { findings, scanned: candidates.length, mdHosts: mdHosts.length, shellElements: shellElements.length };
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

  const inventory = loadInventory();
  const row = rowFor(inventory, id);
  const outDir = path.isAbsolute(outDirArg) ? outDirArg : path.resolve(process.cwd(), outDirArg);
  fs.mkdirSync(outDir, { recursive: true });

  const target = await requireSingleTarget(cdpBase);
  const cdp = new CdpClient(target.webSocketDebuggerUrl);
  try {
    await cdp.connect();
    const expression = `(${browserLayoutProbe.toString()})(${JSON.stringify({ shellSelector: SHELL_SELECTOR, epsilon: EPSILON_PX })})`;
    const result = await cdp.send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: false });
    if (result?.exceptionDetails) fail(`page-side layout probe threw: ${result.exceptionDetails.text || result.exceptionDetails.exception?.description || 'unknown error'}`);
    const { findings, scanned, mdHosts, shellElements } = result.result.value;

    const report = {
      schemaVersion: 1,
      id,
      kind,
      sourceCommit: commit,
      tuple: row.tuple,
      target: target.url,
      shellSelector: SHELL_SELECTOR,
      epsilonPx: EPSILON_PX,
      findings,
      summary: {
        findings: findings.length,
        scanned,
        mdHosts,
        shellElements,
        byKind: findings.reduce((counts, finding) => { counts[finding.kind] = (counts[finding.kind] || 0) + 1; return counts; }, {}),
      },
    };

    const reportPath = path.join(outDir, 'layout-probe.json');
    fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
    console.log(JSON.stringify({ status: 'probed', id, kind, report: reportPath, findings: findings.length, scanned, mdHosts, shellElements }, null, 2));
  } finally {
    cdp.close();
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(`design-reference-layout-probe: ${error instanceof Error ? error.message : String(error)}`);
    process.exitCode = 1;
  });
}
