/** Searchable command palette for destinations, features and settings. */

const DEFAULT_SELECTORS = [
  '[data-command-target]', '[data-feature]', '[data-setting]', '[data-destination]',
  '[role="tab"]', 'a[href^="#"]', '[data-tab-target]', '[data-tab-panel]'
];

const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));

function labelFor(element) {
  return element.dataset.commandLabel || element.dataset.label || element.getAttribute('aria-label') || element.textContent?.trim() || element.id || 'Untitled destination';
}

function targetFor(element) {
  return element.dataset.commandTarget || element.getAttribute('href') || (element.getAttribute('aria-controls') ? `#${element.getAttribute('aria-controls')}` : element.dataset.tabTarget ? `#${element.dataset.tabTarget}` : element.id ? `#${element.id}` : '');
}

export function collectCommands(documentRef = globalThis.document, extra = []) {
  const items = [];
  const seen = new Set();
  const add = (item) => {
    if (!item || !item.label || !item.target || seen.has(`${item.kind}:${item.label}:${item.target}`)) return;
    seen.add(`${item.kind}:${item.label}:${item.target}`);
    items.push({ kind: 'destination', description: '', ...item });
  };
  DEFAULT_SELECTORS.forEach((selector) => documentRef?.querySelectorAll(selector).forEach((element) => {
    if (element.closest('[data-command-dialog]')) return;
    const target = targetFor(element);
    if (!target || (!target.startsWith('#') && !element.dataset.commandAction)) return;
    add({ label: labelFor(element), target, kind: element.dataset.feature ? 'feature' : element.dataset.setting ? 'setting' : 'destination', description: element.dataset.commandDescription || '' });
  }));
  (Array.isArray(extra) ? extra : []).forEach(add);
  return items;
}

function matches(item, query) {
  return `${item.label} ${item.description} ${item.kind}`.toLocaleLowerCase().includes(String(query || '').toLocaleLowerCase());
}

function teleport(item, documentRef, windowRef) {
  if (typeof item.action === 'function') return item.action(item);
  const target = item.target;
  const node = target?.startsWith('#') ? documentRef.querySelector(target) : null;
  if (node) {
    node.hidden = false;
    node.scrollIntoView({ behavior: 'smooth', block: 'center' });
    if (node.matches('[role="tab"]')) node.click();
    else if (typeof node.focus === 'function') node.focus({ preventScroll: true });
    node.classList.add('command-target-highlight');
    windowRef?.setTimeout(() => node.classList.remove('command-target-highlight'), 1200);
    return true;
  }
  if (target && target.startsWith('#')) windowRef?.location.assign(target);
  return Boolean(target);
}

export function initCommandPalette(options = {}) {
  const documentRef = options.document || globalThis.document;
  const windowRef = options.window || globalThis.window;
  if (!documentRef) return () => {};
  const dialog = options.dialog || documentRef.querySelector('[data-command-dialog]');
  const input = options.input || documentRef.querySelector('[data-command-search]');
  const results = options.results || documentRef.querySelector('[data-command-results]');
  if (!dialog || !input || !results) return () => {};
  const opener = options.opener || documentRef.querySelector('[data-command-palette]');
  let commands = collectCommands(documentRef, options.items);
  let activeIndex = -1;
  const render = () => {
    commands = collectCommands(documentRef, options.items);
    const visible = commands.filter((item) => matches(item, input.value));
    results.setAttribute('aria-live', 'polite');
    results.innerHTML = visible.length ? visible.map((item, index) => `<li><button type="button" data-command-index="${index}" aria-label="${escapeHtml(item.label)}"> <span class="command-kind">${escapeHtml(item.kind)}</span><strong>${escapeHtml(item.label)}</strong>${item.description ? `<small>${escapeHtml(item.description)}</small>` : ''}</button></li>`).join('') : '<li class="command-empty" role="status">No matching commands.</li>';
    activeIndex = visible.length ? 0 : -1;
    results.querySelectorAll('[data-command-index]').forEach((button, index) => button.tabIndex = index === activeIndex ? 0 : -1);
  };
  const open = () => { render(); if (typeof dialog.showModal === 'function' && !dialog.open) dialog.showModal(); else dialog.hidden = false; input.focus(); input.select(); };
  const close = () => { if (typeof dialog.close === 'function' && dialog.open) dialog.close(); else dialog.hidden = true; };
  const onInput = render;
  const onKey = (event) => {
    if (event.ctrlKey && event.shiftKey && event.key.toLowerCase() === 'f') { event.preventDefault(); open(); return; }
    if (!dialog.open && dialog.hidden !== false) return;
    const buttons = [...results.querySelectorAll('[data-command-index]')];
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') { event.preventDefault(); if (!buttons.length) return; activeIndex = (activeIndex + (event.key === 'ArrowDown' ? 1 : -1) + buttons.length) % buttons.length; buttons.forEach((button, index) => { button.tabIndex = index === activeIndex ? 0 : -1; }); buttons[activeIndex].focus(); }
    if (event.key === 'Enter' && documentRef.activeElement?.matches('[data-command-index]')) { event.preventDefault(); const item = commands.filter((entry) => matches(entry, input.value))[Number(documentRef.activeElement.dataset.commandIndex)]; if (item) { teleport(item, documentRef, windowRef); close(); } }
    if (event.key === 'Escape') close();
  };
  const onResultsClick = (event) => { const button = event.target.closest('[data-command-index]'); if (!button) return; const item = commands.filter((entry) => matches(entry, input.value))[Number(button.dataset.commandIndex)]; if (item) { teleport(item, documentRef, windowRef); close(); } };
  opener?.addEventListener('click', open); input.addEventListener('input', onInput); documentRef.addEventListener('keydown', onKey); results.addEventListener('click', onResultsClick); render();
  return () => { opener?.removeEventListener('click', open); input.removeEventListener('input', onInput); documentRef.removeEventListener('keydown', onKey); results.removeEventListener('click', onResultsClick); };
}

if (typeof document !== 'undefined') {
  const start = () => initCommandPalette();
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true }); else start();
}
