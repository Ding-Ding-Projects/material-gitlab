// Small persisted boolean stores for the Material feature layer: ADHD modes and the
// accessibility tools. Each flag is independent and every flag is off by default unless
// its defaults say otherwise. Changes are broadcast to other tabs through `storage` events.

const clone = (value) => JSON.parse(JSON.stringify(value));

export function createFlagStore(
  key,
  defaults,
  { storage = globalThis.localStorage, target = globalThis } = {},
) {
  const read = () => {
    try {
      const saved = JSON.parse(storage?.getItem?.(key) || 'null');
      if (saved && typeof saved === 'object' && !Array.isArray(saved)) {
        return Object.fromEntries(
          Object.entries(defaults).map(([name, value]) => [
            name,
            typeof saved[name] === typeof value ? saved[name] : value,
          ]),
        );
      }
    } catch (_error) {
      /* damaged record: fall back to defaults */
    }
    return clone(defaults);
  };
  let state = read();
  const listeners = new Set();
  const emit = () => listeners.forEach((listener) => listener(clone(state)));
  const onStorage = (event) => {
    if (event.key !== key) return;
    state = read();
    emit();
  };
  target?.addEventListener?.('storage', onStorage);

  return {
    key,
    get: () => clone(state),
    isDefault: (name) => state[name] === defaults[name],
    set(name, value) {
      if (!(name in defaults) || typeof value !== typeof defaults[name]) return false;
      state = { ...state, [name]: value };
      try {
        storage?.setItem?.(key, JSON.stringify(state));
      } catch (_error) {
        emit();
        return false;
      }
      emit();
      return true;
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    dispose() {
      target?.removeEventListener?.('storage', onStorage);
      listeners.clear();
    },
  };
}

export const ADHD_STORAGE_KEY = 'material-system.adhd-modes.v1';
export const ADHD_DEFAULTS = Object.freeze({
  focus: false,
  lowStimulation: false,
  timeAwareness: false,
  oneThing: false,
  momentum: false,
});

export const A11Y_STORAGE_KEY = 'material-system.accessibility-tools.v1';
export const A11Y_DEFAULTS = Object.freeze({
  highContrast: false,
  alwaysFocusRing: false,
  largerTargets: false,
  menuHidden: false,
});

export const createAdhdModes = (options) =>
  createFlagStore(ADHD_STORAGE_KEY, ADHD_DEFAULTS, options);
export const createAccessibilityTools = (options) =>
  createFlagStore(A11Y_STORAGE_KEY, A11Y_DEFAULTS, options);
