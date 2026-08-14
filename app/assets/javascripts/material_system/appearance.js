import { createMaterialSettingsStore } from './settings';

export const APPEARANCE_STORAGE_KEY = 'material-system.appearance-overrides.v1';
const ELEMENT_ID = /^element\.[a-z0-9]+(?:[-.][a-z0-9]+)*$/;
const clone = (value) => JSON.parse(JSON.stringify(value));

export function createAppearanceController({
  storage = globalThis.localStorage,
  settingsStore = createMaterialSettingsStore({ storage }),
  history = null,
} = {}) {
  let overrides = {};
  const listeners = new Set();
  try {
    const saved = JSON.parse(storage?.getItem?.(APPEARANCE_STORAGE_KEY) || '{}');
    if (saved && typeof saved === 'object' && !Array.isArray(saved)) overrides = saved;
  } catch (_error) {
    overrides = {};
  }
  const snapshot = () => ({ settings: settingsStore.snapshot(), overrides: clone(overrides) });
  const emit = () => listeners.forEach((listener) => listener(snapshot()));
  const persist = () => {
    try {
      storage?.setItem?.(APPEARANCE_STORAGE_KEY, JSON.stringify(overrides));
      return true;
    } catch (_error) {
      return false;
    }
  };
  const unsubscribeSettings = settingsStore.subscribe(() => emit());

  const api = Object.freeze({
    snapshot,
    subscribe(listener) {
      if (typeof listener !== 'function') return () => {};
      listeners.add(listener);
      listener(snapshot());
      return () => listeners.delete(listener);
    },
    updateGlobal(patch) {
      const result = settingsStore.update(patch);
      if (result.ok)
        history?.record?.({
          action: 'settings-changed',
          targetId: 'appearance.global',
          summary: 'Changed global appearance settings',
          metadata: { fields: Object.keys(patch || {}).join(',') },
        });
      return result;
    },
    editElement(elementId, patch = {}) {
      if (!ELEMENT_ID.test(elementId || ''))
        return { ok: false, errors: ['elementId must be a stable element.* id'] };
      overrides[elementId] = { ...(overrides[elementId] || {}), ...clone(patch) };
      if (!persist()) return { ok: false, errors: ['appearance override could not be persisted'] };
      history?.record?.({
        action: 'appearance-changed',
        targetId: elementId,
        summary: `Changed appearance for ${elementId}`,
        metadata: { fields: Object.keys(patch).join(',') },
      });
      emit();
      return { ok: true, value: clone(overrides[elementId]) };
    },
    resetElement(elementId) {
      delete overrides[elementId];
      if (!persist()) return { ok: false, errors: ['appearance override could not be persisted'] };
      history?.record?.({
        action: 'appearance-reset',
        targetId: elementId,
        summary: `Reset appearance for ${elementId}`,
      });
      emit();
      return { ok: true };
    },
    resetAll() {
      overrides = {};
      const settingsResult = settingsStore.reset();
      if (!persist() || !settingsResult.ok)
        return { ok: false, errors: ['appearance could not be reset'] };
      history?.record?.({
        action: 'appearance-reset',
        targetId: 'appearance.global',
        summary: 'Reset all appearance settings',
      });
      emit();
      return { ok: true };
    },
    contextActions(elementId, { onEdit, onLock } = {}) {
      if (!ELEMENT_ID.test(elementId || '')) return [];
      return [
        {
          id: 'appearance.edit',
          label: 'Edit appearance…',
          shortcut: 'Shift+F10',
          run: () => onEdit?.(elementId),
        },
        { id: 'appearance.lock', label: 'Lock this element…', run: () => onLock?.(elementId) },
      ];
    },
    tokens: () => settingsStore.tokens(),
    dispose() {
      unsubscribeSettings();
      settingsStore.dispose?.();
      listeners.clear();
    },
  });
  return api;
}
