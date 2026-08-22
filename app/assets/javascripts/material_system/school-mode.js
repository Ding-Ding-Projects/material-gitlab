export const SCHOOL_MODE_SCHEMA_VERSION = 1;
export const SCHOOL_MODE_STORAGE_KEY = 'material-system.school-mode.v1';
export const DEFAULT_SCHOOL_MODE = Object.freeze({
  schemaVersion: SCHOOL_MODE_SCHEMA_VERSION,
  enabled: false,
  displayName: 'School mode',
  updatedAt: null,
});

const clone = (value) => JSON.parse(JSON.stringify(value));

function normalize(candidate) {
  if (!candidate || candidate.schemaVersion !== SCHOOL_MODE_SCHEMA_VERSION)
    return clone(DEFAULT_SCHOOL_MODE);
  return {
    schemaVersion: SCHOOL_MODE_SCHEMA_VERSION,
    enabled: candidate.enabled === true,
    displayName:
      typeof candidate.displayName === 'string' && candidate.displayName.trim()
        ? candidate.displayName.slice(0, 80)
        : DEFAULT_SCHOOL_MODE.displayName,
    updatedAt: typeof candidate.updatedAt === 'string' ? candidate.updatedAt : null,
  };
}

export function createSchoolModeAdapter({
  storage = globalThis.localStorage,
  target = globalThis,
  unlockAdapter = null,
  clock = () => new Date().toISOString(),
} = {}) {
  let state;
  try {
    state = normalize(JSON.parse(storage?.getItem?.(SCHOOL_MODE_STORAGE_KEY) || 'null'));
  } catch (_error) {
    state = clone(DEFAULT_SCHOOL_MODE);
  }
  const listeners = new Set();
  const snapshot = () => clone(state);
  const emit = () => listeners.forEach((listener) => listener(snapshot()));
  const persist = () => {
    try {
      storage?.setItem?.(SCHOOL_MODE_STORAGE_KEY, JSON.stringify(state));
      return true;
    } catch (_error) {
      return false;
    }
  };
  const onStorage = (event) => {
    if (event.key !== SCHOOL_MODE_STORAGE_KEY) return;
    try {
      state = normalize(JSON.parse(event.newValue || 'null'));
    } catch (_error) {
      state = clone(DEFAULT_SCHOOL_MODE);
    }
    emit();
  };
  target?.addEventListener?.('storage', onStorage);

  return Object.freeze({
    snapshot,
    subscribe(listener) {
      if (typeof listener !== 'function') return () => {};
      listeners.add(listener);
      listener(snapshot());
      return () => listeners.delete(listener);
    },
    enable({ displayName = state.displayName } = {}) {
      state = normalize({ ...state, enabled: true, displayName, updatedAt: clock() });
      if (!persist())
        return {
          ok: false,
          status: 'unavailable',
          reason: 'Shared School mode state could not be persisted',
        };
      emit();
      return { ok: true, value: snapshot() };
    },
    async disable(credential) {
      if (!unlockAdapter || typeof unlockAdapter.verify !== 'function') {
        return {
          ok: false,
          status: 'unavailable',
          reason: 'School mode unlock adapter is not registered',
        };
      }
      const verified = await unlockAdapter.verify(credential);
      if (!verified)
        return { ok: false, status: 'rejected', reason: 'The unlock value did not match' };
      state = { ...state, enabled: false, updatedAt: clock() };
      if (!persist())
        return {
          ok: false,
          status: 'unavailable',
          reason: 'Shared School mode state could not be persisted',
        };
      emit();
      return { ok: true, value: snapshot() };
    },
    rename(displayName) {
      if (typeof displayName !== 'string' || !displayName.trim() || displayName.length > 80)
        return { ok: false, errors: ['displayName must be 1-80 characters'] };
      state = { ...state, displayName, updatedAt: clock() };
      if (!persist())
        return { ok: false, errors: ['Shared School mode state could not be persisted'] };
      emit();
      return { ok: true, value: snapshot() };
    },
    presentationSettings(baseSettings) {
      if (!state.enabled) return clone(baseSettings);
      return {
        ...clone(baseSettings),
        language: 'en',
        funnyLevelEnglish: 1,
        funnyLevelCantonese: 1,
        showDialogEmojis: false,
        personalVocabularyEnabled: false,
        dimSumEnabled: false,
      };
    },
    dispose() {
      target?.removeEventListener?.('storage', onStorage);
      listeners.clear();
    },
  });
}
