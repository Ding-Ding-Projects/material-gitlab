import Vue from 'vue';
import { loadSettings, updateSettings, subscribeSettings } from '../settings';
import { createAdhdModes, createAccessibilityTools } from './flags';
import { applyToDocument } from './document';

export const SETUP_STORAGE_KEY = 'material-system.setup-wizard.v1';

// One reactive store shared by the top bar controls, the features rail, the feature hub
// and the setup wizard, so every view of a value reads and writes the same thing.
export function createFeatureState({
  storage = globalThis.localStorage,
  root,
  target = globalThis,
} = {}) {
  const adhdStore = createAdhdModes({ storage, target });
  const a11yStore = createAccessibilityTools({ storage, target });
  const readSetup = () => {
    try {
      const saved = JSON.parse(storage?.getItem?.(SETUP_STORAGE_KEY) || 'null');
      if (saved && typeof saved.step === 'number') return saved;
    } catch (_error) {
      /* treat as not started */
    }
    return { step: 0, completed: false, skipped: [] };
  };

  const state = Vue.observable({
    settings: loadSettings(storage),
    adhd: adhdStore.get(),
    a11y: a11yStore.get(),
    setup: readSetup(),
    hubOpen: false,
    hubTab: 'setup',
    error: '',
    pageLoadedAt: Date.now(),
  });

  const apply = () => applyToDocument(state, root);
  const unsubscribers = [
    subscribeSettings((next) => {
      state.settings = next;
      apply();
    }, target),
    adhdStore.subscribe((next) => {
      state.adhd = next;
      apply();
    }),
    a11yStore.subscribe((next) => {
      state.a11y = next;
      apply();
    }),
  ];
  apply();

  return {
    state,
    setSetting(patch) {
      const result = updateSettings(patch, storage);
      if (result.ok) {
        state.settings = result.value;
        state.error = '';
      } else {
        state.error = 'saveFailed';
      }
      apply();
      return result.ok;
    },
    setAdhd(name, value) {
      const ok = adhdStore.set(name, value);
      state.error = ok ? '' : 'saveFailed';
      return ok;
    },
    setA11y(name, value) {
      const ok = a11yStore.set(name, value);
      state.error = ok ? '' : 'saveFailed';
      return ok;
    },
    isA11yDefault: (name) => a11yStore.isDefault(name),
    isAdhdDefault: (name) => adhdStore.isDefault(name),
    saveSetup(patch) {
      state.setup = { ...state.setup, ...patch };
      try {
        storage?.setItem?.(SETUP_STORAGE_KEY, JSON.stringify(state.setup));
        return true;
      } catch (_error) {
        state.error = 'saveFailed';
        return false;
      }
    },
    openHub(tab = state.hubTab) {
      state.hubTab = tab;
      state.hubOpen = true;
    },
    closeHub() {
      state.hubOpen = false;
    },
    exportJson() {
      return JSON.stringify(
        {
          exportedAt: new Date().toISOString(),
          settings: state.settings,
          adhdModes: state.adhd,
          accessibilityTools: state.a11y,
        },
        null,
        2,
      );
    },
    dispose() {
      unsubscribers.forEach((unsubscribe) => unsubscribe());
      adhdStore.dispose();
      a11yStore.dispose();
    },
  };
}
