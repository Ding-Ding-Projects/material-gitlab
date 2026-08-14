import { RegexBuilder } from './regex-builder';

export const TAB_SCHEMA_VERSION = 1;
export const TAB_STORAGE_PREFIX = 'material-system.tabs.v1';
export const TAB_DOCKS = Object.freeze(['left', 'right', 'top', 'bottom']);
export const TAB_SEARCH_SCOPES = Object.freeze(['strip', 'group', 'groups', 'master']);

const clone = (value) => JSON.parse(JSON.stringify(value));
const TAB_ID = /^tab\.[a-z0-9]+(?:[-.][a-z0-9]+)*$/;
const GROUP_ID = /^group\.[a-z0-9]+(?:[-.][a-z0-9]+)*$/;

function initialState(workspaceId) {
  return {
    schemaVersion: TAB_SCHEMA_VERSION,
    workspaceId,
    dock: 'left',
    tabs: [],
    groups: [],
    activeTabId: null,
  };
}

export function createTabWorkspace({
  workspaceId = 'default',
  storage = globalThis.localStorage,
} = {}) {
  const storageKey = `${TAB_STORAGE_PREFIX}.${workspaceId}`;
  let state = initialState(workspaceId);
  try {
    const saved = JSON.parse(storage?.getItem?.(storageKey) || 'null');
    if (
      saved?.schemaVersion === TAB_SCHEMA_VERSION &&
      saved.workspaceId === workspaceId &&
      TAB_DOCKS.includes(saved.dock) &&
      Array.isArray(saved.tabs) &&
      Array.isArray(saved.groups)
    )
      state = saved;
  } catch (_error) {
    /* keep a truthful empty workspace */
  }
  const listeners = new Set();
  const searches = new Map([
    ['strip', new RegexBuilder()],
    ['groups', new RegexBuilder()],
    ['master', new RegexBuilder()],
  ]);
  state.groups.forEach(({ id }) => searches.set(`group:${id}`, new RegexBuilder()));

  const snapshot = () => ({
    ...clone(state),
    searches: Object.fromEntries([...searches].map(([key, builder]) => [key, builder.snapshot()])),
  });
  const persist = () => {
    try {
      storage?.setItem?.(storageKey, JSON.stringify(state));
      return true;
    } catch (_error) {
      return false;
    }
  };
  const emit = () => listeners.forEach((listener) => listener(snapshot()));
  const commit = () => {
    const ok = persist();
    emit();
    return ok;
  };
  const tabById = (id) => state.tabs.find((tab) => tab.id === id);
  const groupById = (id) => state.groups.find((group) => group.id === id);

  function resolveSearch(scope, key) {
    if (scope === 'group') return searches.get(`group:${key}`);
    return searches.get(scope);
  }

  function search(scope, key) {
    const builder = resolveSearch(scope, key);
    if (!builder) return [];
    const searchState = builder.snapshot();
    let candidates;
    if (scope === 'groups') candidates = state.groups.map((group) => ({ type: 'group', ...group }));
    else if (scope === 'group') candidates = state.tabs.filter((tab) => tab.groupId === key);
    else candidates = state.tabs;
    let matcher;
    if (searchState.regex) {
      try {
        matcher = new RegExp(searchState.pattern, searchState.flags.replace(/[gy]/g, ''));
      } catch (_error) {
        return [];
      }
    }
    const plain = searchState.pattern.toLocaleLowerCase();
    return candidates
      .filter((candidate) => {
        const haystack = `${candidate.title || candidate.name || ''} ${candidate.label || ''}`;
        return matcher ? matcher.test(haystack) : haystack.toLocaleLowerCase().includes(plain);
      })
      .map((candidate) => ({
        ...clone(candidate),
        workspaceId,
        groupId: candidate.groupId || (candidate.type === 'group' ? candidate.id : null),
        pinned: candidate.pinned === true,
      }));
  }

  const api = Object.freeze({
    snapshot,
    subscribe(listener) {
      if (typeof listener !== 'function') return () => {};
      listeners.add(listener);
      listener(snapshot());
      return () => listeners.delete(listener);
    },
    setDock(dock) {
      if (!TAB_DOCKS.includes(dock))
        return { ok: false, errors: ['dock must be left, right, top, or bottom'] };
      state.dock = dock;
      return { ok: commit(), dock };
    },
    addTab(tab) {
      if (!tab || !TAB_ID.test(tab.id || '') || typeof tab.title !== 'string' || !tab.title.trim())
        throw new Error('Tab requires a stable tab.* id and title');
      if (tabById(tab.id)) throw new Error(`Tab already exists: ${tab.id}`);
      if (tab.groupId && !groupById(tab.groupId))
        throw new Error(`Unknown tab group: ${tab.groupId}`);
      state.tabs.push({
        id: tab.id,
        title: tab.title,
        label: tab.label || tab.title,
        windowId: tab.windowId || 'current',
        stripId: tab.stripId || 'primary',
        groupId: tab.groupId || null,
        pinned: tab.pinned === true,
        unsaved: tab.unsaved === true,
        order: state.tabs.length,
        metadata: { ...(tab.metadata || {}) },
      });
      state.activeTabId ||= tab.id;
      return { ok: commit(), tab: clone(tabById(tab.id)) };
    },
    activateTab(id) {
      if (!tabById(id)) return { ok: false, status: 'missing', reason: `Unknown tab: ${id}` };
      state.activeTabId = id;
      commit();
      return { ok: true, tab: clone(tabById(id)) };
    },
    removeTab(id, { force = false } = {}) {
      const tab = tabById(id);
      if (!tab) return { ok: false, status: 'missing', reason: `Unknown tab: ${id}` };
      if (tab.unsaved && !force)
        return { ok: false, status: 'confirmation-required', reason: 'Tab has unsaved work' };
      state.tabs = state.tabs.filter((candidate) => candidate.id !== id);
      if (state.activeTabId === id) state.activeTabId = state.tabs[0]?.id || null;
      return { ok: commit(), tab: clone(tab) };
    },
    pinTab(id, pinned = true) {
      const tab = tabById(id);
      if (!tab) return { ok: false, status: 'missing', reason: `Unknown tab: ${id}` };
      tab.pinned = Boolean(pinned);
      commit();
      return { ok: true, tab: clone(tab) };
    },
    createGroup(group) {
      if (
        !group ||
        !GROUP_ID.test(group.id || '') ||
        typeof group.name !== 'string' ||
        !group.name.trim()
      )
        throw new Error('Group requires a stable group.* id and name');
      if (groupById(group.id)) throw new Error(`Group already exists: ${group.id}`);
      state.groups.push({
        id: group.id,
        name: group.name,
        label: group.label || group.name,
        color: group.color || null,
        collapsed: group.collapsed === true,
        pinned: group.pinned === true,
        order: state.groups.length,
        appearance: {},
      });
      searches.set(`group:${group.id}`, new RegexBuilder());
      return { ok: commit(), group: clone(groupById(group.id)) };
    },
    updateGroup(id, patch = {}) {
      const group = groupById(id);
      if (!group) return { ok: false, status: 'missing', reason: `Unknown group: ${id}` };
      Object.assign(
        group,
        Object.fromEntries(
          Object.entries(patch).filter(([key]) =>
            ['name', 'label', 'color', 'collapsed', 'pinned', 'appearance'].includes(key),
          ),
        ),
      );
      commit();
      return { ok: true, group: clone(group) };
    },
    moveTabToGroup(tabId, groupId = null) {
      const tab = tabById(tabId);
      if (!tab) return { ok: false, status: 'missing', reason: `Unknown tab: ${tabId}` };
      if (groupId && !groupById(groupId))
        return { ok: false, status: 'missing', reason: `Unknown group: ${groupId}` };
      tab.groupId = groupId;
      commit();
      return { ok: true, tab: clone(tab) };
    },
    setSearch(scope, key, patch = {}) {
      const builder = resolveSearch(scope, key);
      if (!builder) return { ok: false, status: 'missing', reason: `Unknown ${scope} search` };
      return { ok: true, state: builder.update(patch), results: search(scope, key) };
    },
    search,
    previewBulkClose({ scope = 'master', key, includePinned = false, inverse = false } = {}) {
      const matched = search(scope, key).filter((tab) => tab.type !== 'group');
      const matchedIds = new Set(matched.map(({ id }) => id));
      const candidates = state.tabs.filter(
        (tab) =>
          (inverse ? !matchedIds.has(tab.id) : matchedIds.has(tab.id)) &&
          (includePinned || !tab.pinned),
      );
      return {
        count: candidates.length,
        tabs: clone(candidates),
        excludedPinned: state.tabs
          .filter((tab) => tab.pinned && candidates.every(({ id }) => id !== tab.id))
          .map(({ id }) => id),
        requiresConfirmation: candidates.some(({ unsaved }) => unsaved),
      };
    },
    dispose() {
      listeners.clear();
      searches.clear();
    },
  });
  return api;
}
