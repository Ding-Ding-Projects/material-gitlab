export const HISTORY_SCHEMA_VERSION = 1;
export const HISTORY_STORAGE_KEY = 'material-system.history.v1';
export const HISTORY_LIMITS = Object.freeze({ events: 1000, summary: 256, metadataBytes: 4096 });

const clone = (value) => JSON.parse(JSON.stringify(value));
const FORBIDDEN_METADATA_KEYS =
  /(?:password|passcode|pin|secret|token|credential|authorization|cookie|payload|filePath)/i;

function sanitizeMetadata(metadata) {
  if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) return {};
  const clean = {};
  Object.entries(metadata).forEach(([key, value]) => {
    if (FORBIDDEN_METADATA_KEYS.test(key)) {
      clean[key] = '[redacted]';
      return;
    }
    if (['string', 'number', 'boolean'].includes(typeof value) || value === null)
      clean[key] = value;
  });
  return clean;
}

export function createHistoryStore({
  storage = globalThis.localStorage,
  clock = () => new Date().toISOString(),
  limits = HISTORY_LIMITS,
} = {}) {
  let sequence = 0;
  let events = [];
  const listeners = new Set();
  try {
    const candidate = JSON.parse(storage?.getItem?.(HISTORY_STORAGE_KEY) || 'null');
    if (candidate?.schemaVersion === HISTORY_SCHEMA_VERSION && Array.isArray(candidate.events)) {
      events = candidate.events.slice(-limits.events);
      sequence = events.reduce(
        (maximum, event) => Math.max(maximum, Number(event.sequence) || 0),
        0,
      );
    }
  } catch (_error) {
    events = [];
  }

  const snapshot = () => ({ schemaVersion: HISTORY_SCHEMA_VERSION, entries: clone(events) });
  const persist = () => {
    try {
      storage?.setItem?.(
        HISTORY_STORAGE_KEY,
        JSON.stringify({ schemaVersion: HISTORY_SCHEMA_VERSION, events }),
      );
      return true;
    } catch (_error) {
      return false;
    }
  };
  const emit = () => listeners.forEach((listener) => listener(snapshot()));

  return Object.freeze({
    snapshot,
    subscribe(listener) {
      if (typeof listener !== 'function') return () => {};
      listeners.add(listener);
      listener(snapshot());
      return () => listeners.delete(listener);
    },
    record({ action, targetId, summary, metadata = {} } = {}) {
      if (
        ![action, targetId, summary].every((value) => typeof value === 'string' && value.trim())
      ) {
        return { ok: false, errors: ['history action, targetId, and summary are required'] };
      }
      const safeMetadata = sanitizeMetadata(metadata);
      if (JSON.stringify(safeMetadata).length > limits.metadataBytes)
        return { ok: false, errors: ['history metadata exceeds limit'] };
      const event = Object.freeze({
        id: `history-${++sequence}`,
        sequence,
        action,
        targetId,
        summary: summary.slice(0, limits.summary),
        metadata: safeMetadata,
        createdAt: clock(),
      });
      events = [...events, event].slice(-limits.events);
      if (!persist()) return { ok: false, errors: ['history could not be persisted'] };
      emit();
      return { ok: true, event: clone(event) };
    },
    query({ actions = [], from, to, text = '' } = {}) {
      const actionSet = new Set(actions);
      const query = String(text).toLocaleLowerCase();
      return snapshot().entries.filter(
        (event) =>
          (!actionSet.size || actionSet.has(event.action)) &&
          (!from || event.createdAt >= from) &&
          (!to || event.createdAt <= to) &&
          (!query || `${event.summary} ${event.targetId}`.toLocaleLowerCase().includes(query)),
      );
    },
    dispose: () => listeners.clear(),
  });
}
