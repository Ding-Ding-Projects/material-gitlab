/** Local, non-blocking notification stack and reviewable notification centre. */

export const NOTIFICATIONS_STORAGE_KEY = 'material-gitlab.notifications.v1';
export const NOTIFICATIONS_SCHEMA_VERSION = 1;

const storageOf = (storage) => { if (storage) return storage; try { return globalThis.localStorage; } catch { return null; } };
const uid = () => `notice-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
const now = () => new Date().toISOString();
const read = (storage) => { try { const value = JSON.parse(storageOf(storage)?.getItem(NOTIFICATIONS_STORAGE_KEY) || '[]'); return Array.isArray(value) ? value.filter((item) => item && item.id && item.message) : []; } catch { return []; } };
const write = (items, storage) => { try { storageOf(storage)?.setItem(NOTIFICATIONS_STORAGE_KEY, JSON.stringify(items.slice(-200))); } catch { /* local storage may be unavailable */ } return items; };

export function loadNotifications(storage) { return read(storage); }
export function saveNotifications(items, storage) { return write(items, storage); }
export function createNotification(message, options = {}) { return { id: String(options.id || uid()), title: String(options.title || ''), message: String(message), kind: ['info', 'success', 'warning', 'error', 'progress'].includes(options.kind) ? options.kind : 'info', createdAt: options.createdAt || now(), dismissed: false, read: false, actionLabel: options.actionLabel ? String(options.actionLabel) : '', action: options.action, meta: options.meta && typeof options.meta === 'object' ? options.meta : {} }; }
export function dismissNotification(id, storage) { const next = read(storage).map((item) => item.id === id ? { ...item, dismissed: true, read: true } : item); return write(next, storage); }
export function dismissNotifications(ids, storage) { const selected = new Set(ids || []); const next = read(storage).map((item) => selected.has(item.id) ? { ...item, dismissed: true, read: true } : item); return write(next, storage); }
export function markNotificationsRead(ids, storage) { const selected = new Set(ids || []); const next = read(storage).map((item) => selected.has(item.id) ? { ...item, read: true } : item); return write(next, storage); }
export function exportNotifications(items = read(), format = 'json') { const safe = items.map(({ action, ...item }) => item); if (format === 'markdown') return safe.map((item) => `- **${item.kind}** ${item.title ? `${item.title}: ` : ''}${item.message} (${item.createdAt})`).join('\n'); return JSON.stringify({ schemaVersion: NOTIFICATIONS_SCHEMA_VERSION, notifications: safe }, null, 2); }

export function initNotifications(options = {}) {
  const documentRef = options.document || globalThis.document;
  const storage = options.storage;
  if (!documentRef) return { notify: () => null, destroy: () => {} };
  const stack = options.stack || documentRef.querySelector('[data-notification-stack]') || (() => { const node = documentRef.createElement('aside'); node.className = 'notification-stack'; node.dataset.notificationStack = ''; node.setAttribute('aria-label', 'Notifications'); documentRef.body.append(node); return node; })();
  const centre = options.centre || documentRef.querySelector('[data-notification-centre]');
  const renderStack = () => { stack.innerHTML = read(storage).filter((item) => !item.dismissed).slice(-5).map((item) => `<article class="notification notification-${item.kind}" data-notification-id="${item.id}" role="${item.kind === 'error' || item.kind === 'warning' ? 'alert' : 'status'}"><div><strong>${item.title}</strong><p>${item.message}</p></div><button type="button" data-dismiss-notification="${item.id}" aria-label="Dismiss notification">Dismiss</button></article>`).join(''); };
  const renderCentre = () => { if (!centre) return; const items = read(storage); centre.innerHTML = `<div class="notification-centre-toolbar"><strong>Notification centre</strong><button type="button" data-export-notifications>Export</button><button type="button" data-dismiss-selected>Dismiss selected</button></div><div class="notification-centre-list">${items.length ? items.map((item) => `<label class="notification-row${item.dismissed ? ' is-dismissed' : ''}"><input type="checkbox" data-notification-select="${item.id}" /><span><strong>${item.title || item.kind}</strong><span>${item.message}</span><small>${item.createdAt}</small></span></label>`).join('') : '<p role="status">No notifications yet.</p>'}</div>`; };
  const render = () => { renderStack(); renderCentre(); };
  const notify = (message, opts = {}) => { const item = createNotification(message, opts); write([...read(storage), item], storage); render(); return item; };
  const onClick = (event) => { const dismiss = event.target.closest('[data-dismiss-notification]'); if (dismiss) { dismissNotification(dismiss.dataset.dismissNotification, storage); render(); return; } if (event.target.closest('[data-dismiss-selected]')) { dismissNotifications([...documentRef.querySelectorAll('[data-notification-select]:checked')].map((input) => input.dataset.notificationSelect), storage); render(); return; } if (event.target.closest('[data-export-notifications]')) { const blob = new Blob([exportNotifications(read(storage), 'json')], { type: 'application/json' }); const link = documentRef.createElement('a'); link.href = URL.createObjectURL(blob); link.download = 'material-gitlab-notifications.json'; link.click(); URL.revokeObjectURL(link.href); } };
  stack.addEventListener('click', onClick); centre?.addEventListener('click', onClick); render();
  return { notify, render, destroy: () => { stack.removeEventListener('click', onClick); centre?.removeEventListener('click', onClick); }, dismiss: (id) => { dismissNotification(id, storage); render(); } };
}

if (typeof document !== 'undefined') { const start = () => { globalThis.materialNotifications = initNotifications(); }; if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true }); else start(); }
