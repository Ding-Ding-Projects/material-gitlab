const STORAGE_KEY = 'material-gitlab.toy-locks.v1';
const MAX_LOCKS = 500;

function storage() { return typeof localStorage === 'undefined' ? null : localStorage; }
function safeId(value) { return String(value || '').trim().slice(0, 128).replace(/[^A-Za-z0-9._:-]/g, '-'); }
function read() {
  try {
    const parsed = JSON.parse(storage()?.getItem(STORAGE_KEY) || '{"version":1,"locks":[]}');
    if (parsed.version !== 1 || !Array.isArray(parsed.locks)) throw new Error('invalid lock record');
    return { version: 1, locks: parsed.locks.filter((item) => item && typeof item.id === 'string').slice(0, MAX_LOCKS) };
  } catch { return { version: 1, locks: [] }; }
}
function write(value) { storage()?.setItem(STORAGE_KEY, JSON.stringify(value)); return value; }

/** Toy locks deliberately persist metadata only. Credentials never enter browser storage. */
export function listLocks() { return read().locks.map((lock) => ({ ...lock })); }
export function createLock({ target, method = 'password', duration = 'session', minutes = null } = {}) {
  if (!target || !['password', 'totp'].includes(method)) throw new Error('A target and supported lock method are required.');
  const record = { id: safeId(`${target}-${Date.now()}-${Math.random().toString(36).slice(2)}`), target: String(target).slice(0, 256), method, duration, minutes: duration === 'minutes' ? Math.max(1, Math.min(1440, Number(minutes) || 1)) : null, createdAt: new Date().toISOString(), locked: true };
  const next = read(); next.locks = [record, ...next.locks.filter((item) => item.target !== record.target)].slice(0, MAX_LOCKS); write(next); return { ...record };
}
export function setLockState(id, locked) { const next = read(); const item = next.locks.find((lock) => lock.id === id); if (!item) return null; item.locked = Boolean(locked); write(next); return { ...item }; }
export function removeLock(id) { const next = read(); next.locks = next.locks.filter((lock) => lock.id !== id); write(next); return true; }
export function clearLocks() { storage()?.removeItem(STORAGE_KEY); }
export function lockRecoveryDisclosure() { return 'Toy locks are a speed bump, not security. If you forget a credential, clear this site\'s local application data to reset locks.'; }
export function bindToyLockSurface(root = document, { onChange = () => {} } = {}) {
  root.querySelectorAll('[data-lock-target]').forEach((element) => element.addEventListener('click', () => {
    const target = element.dataset.lockTarget;
    const existing = listLocks().find((lock) => lock.target === target);
    const result = existing ? setLockState(existing.id, !existing.locked) : createLock({ target });
    onChange(result, lockRecoveryDisclosure());
  }));
  return { listLocks, createLock, setLockState, removeLock, clearLocks };
}
