const HISTORY_KEY = 'material-gitlab:visitor-history:v1';
const MAX_EVENTS = 500;

const storage = () => {
  try { return window.localStorage; } catch { return null; }
};

const safeValue = (value) => {
  if (value == null || typeof value === 'boolean' || typeof value === 'number') return value;
  if (typeof value !== 'string') return undefined;
  // History is deliberately metadata-only: never persist paths, file contents, tokens, or payloads.
  if (/token|secret|password|credential|authorization|contents?|payload|path|uri/i.test(value)) return '[omitted]';
  return value.slice(0, 240);
};

const redact = (metadata = {}) => Object.fromEntries(Object.entries(metadata).flatMap(([key, value]) => {
  if (/token|secret|password|credential|authorization|contents?|payload|path|file|source/i.test(key)) return [[key, '[omitted]']];
  const safe = safeValue(value);
  return safe === undefined ? [] : [[key, safe]];
}));

export function loadHistory() {
  const store = storage();
  if (!store) return [];
  try {
    const parsed = JSON.parse(store.getItem(HISTORY_KEY) || '[]');
    return Array.isArray(parsed) ? parsed.filter((event) => event && typeof event.id === 'string') : [];
  } catch { return []; }
}

export function appendHistoryEvent(action, metadata = {}) {
  const event = {
    id: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
    timestamp: new Date().toISOString(),
    action: String(action || 'updated').slice(0, 80),
    metadata: redact(metadata),
  };
  const next = [...loadHistory(), event].slice(-MAX_EVENTS);
  try { storage()?.setItem(HISTORY_KEY, JSON.stringify(next)); } catch { /* storage is best effort */ }
  return event;
}

export function clearHistory() {
  try { storage()?.removeItem(HISTORY_KEY); } catch { /* no-op */ }
}

export function filterHistory(events = loadHistory(), { query = '', action = '', from = '', to = '' } = {}) {
  const needle = String(query).trim().toLowerCase();
  return events.filter((event) => {
    const date = event.timestamp.slice(0, 10);
    if (from && date < from) return false;
    if (to && date > to) return false;
    if (action && event.action !== action) return false;
    return !needle || `${event.action} ${JSON.stringify(event.metadata)}`.toLowerCase().includes(needle);
  });
}

export { HISTORY_KEY };
