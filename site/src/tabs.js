/**
 * Browser-style tab state for the site shell.
 *
 * The module is intentionally framework agnostic: state can be persisted with
 * the browser storage adapter and rendered by the host application or by the
 * small DOM renderer below. Search state is independent for the strip, group
 * members, group names and master tab list.
 */

export const TAB_STORAGE_KEY = 'material-gitlab.tabs.v1';
export const DOCKS = Object.freeze(['left', 'right', 'top', 'bottom']);
export const SEARCH_KEYS = Object.freeze(['strip', 'groupMembers', 'groupNames', 'master']);
export const EMPTY_SEARCH = Object.freeze({ query: '', regex: false, pattern: '', flags: 'i', error: '' });

const clone = (value) => JSON.parse(JSON.stringify(value));
const idOf = (value, fallback) => String(value ?? fallback);

export const DEFAULT_TAB_STATE = Object.freeze({
  version: 1,
  dock: 'left',
  activeTab: '',
  tabs: [],
  groups: [],
  searches: {
    strip: clone(EMPTY_SEARCH),
    groupMembers: clone(EMPTY_SEARCH),
    groupNames: clone(EMPTY_SEARCH),
    master: clone(EMPTY_SEARCH),
  },
});

function normalizeTab(tab, index) {
  const id = idOf(tab?.id, `tab-${index + 1}`);
  return {
    id,
    label: String(tab?.label || id),
    route: String(tab?.route || `#${id}`),
    groupId: tab?.groupId == null ? (tab?.group ? String(tab.group) : null) : String(tab.groupId),
    pinned: Boolean(tab?.pinned),
    locked: Boolean(tab?.locked),
  };
}

function normalizeGroup(group, index) {
  const id = idOf(group?.id, `group-${index + 1}`);
  return { id, label: String(group?.label || id), collapsed: Boolean(group?.collapsed), color: group?.color ? String(group.color) : '' };
}

function normalizeSearch(search) {
  const next = { ...clone(EMPTY_SEARCH), ...(search || {}) };
  next.query = String(next.query || '');
  next.pattern = String(next.pattern || '');
  next.flags = String(next.flags || 'i');
  next.regex = Boolean(next.regex);
  next.error = '';
  if (next.regex && next.pattern) {
    try { new RegExp(next.pattern, next.flags); } catch (error) { next.error = error.message; }
  }
  return next;
}

export function createTabState(input = {}) {
  const tabs = Array.isArray(input.tabs) ? input.tabs.map(normalizeTab) : [];
  const groups = Array.isArray(input.groups) ? input.groups.map(normalizeGroup) : [];
  const searches = {};
  SEARCH_KEYS.forEach((key) => { searches[key] = normalizeSearch(input.searches?.[key]); });
  const activeTab = tabs.some((tab) => tab.id === input.activeTab) ? input.activeTab : (tabs[0]?.id || '');
  return { version: 1, dock: DOCKS.includes(input.dock) ? input.dock : 'left', activeTab, tabs, groups, searches };
}

export function loadTabState(storage = globalThis?.localStorage, key = TAB_STORAGE_KEY) {
  if (!storage) return createTabState();
  try { return createTabState(JSON.parse(storage.getItem(key) || '{}')); } catch { return createTabState(); }
}

export function saveTabState(state, storage = globalThis?.localStorage, key = TAB_STORAGE_KEY) {
  const normalized = createTabState(state);
  try { storage?.setItem(key, JSON.stringify(normalized)); } catch { /* storage may be unavailable or quota-limited */ }
  return normalized;
}

export function setDock(state, dock) { return DOCKS.includes(dock) ? { ...state, dock } : state; }
export function activateTab(state, tabId) { return state.tabs.some((tab) => tab.id === tabId) ? { ...state, activeTab: tabId } : state; }

export function addTab(state, tab) {
  if (!tab || state.tabs.some((item) => item.id === String(tab.id))) return state;
  const next = { ...state, tabs: [...state.tabs, normalizeTab(tab, state.tabs.length)] };
  return next.activeTab ? next : { ...next, activeTab: next.tabs[0].id };
}

export function closeTab(state, tabId) {
  const index = state.tabs.findIndex((tab) => tab.id === tabId);
  if (index < 0) return state;
  const tabs = state.tabs.filter((tab) => tab.id !== tabId);
  const activeTab = state.activeTab === tabId ? (tabs[index]?.id || tabs[index - 1]?.id || '') : state.activeTab;
  return { ...state, tabs, activeTab };
}

export function togglePin(state, tabId, pinned) {
  const tabs = state.tabs.map((tab) => tab.id === tabId ? { ...tab, pinned: pinned == null ? !tab.pinned : Boolean(pinned) } : tab);
  return { ...state, tabs: reorderPinned(tabs) };
}

export function reorderTabs(state, tabId, targetIndex) {
  const from = state.tabs.findIndex((tab) => tab.id === tabId);
  if (from < 0 || !Number.isInteger(targetIndex)) return state;
  const tabs = state.tabs.slice();
  const [tab] = tabs.splice(from, 1);
  const index = Math.max(0, Math.min(targetIndex, tabs.length));
  tabs.splice(index, 0, tab);
  return { ...state, tabs };
}

function reorderPinned(tabs) {
  const pinned = tabs.filter((tab) => tab.pinned);
  const normal = tabs.filter((tab) => !tab.pinned);
  return [...pinned, ...normal];
}

export function createGroup(state, group = {}) {
  const id = idOf(group.id, `group-${Date.now().toString(36)}`);
  if (state.groups.some((item) => item.id === id)) return state;
  return { ...state, groups: [...state.groups, normalizeGroup({ ...group, id }, state.groups.length)] };
}

export function renameGroup(state, groupId, label) { return { ...state, groups: state.groups.map((group) => group.id === groupId ? { ...group, label: String(label || group.label) } : group) }; }
export function toggleGroup(state, groupId, collapsed) { return { ...state, groups: state.groups.map((group) => group.id === groupId ? { ...group, collapsed: collapsed == null ? !group.collapsed : Boolean(collapsed) } : group) }; }
export function removeGroup(state, groupId) {
  return { ...state, groups: state.groups.filter((group) => group.id !== groupId), tabs: state.tabs.map((tab) => tab.groupId === groupId ? { ...tab, groupId: null } : tab) };
}
export function moveTabToGroup(state, tabId, groupId = null) {
  if (groupId != null && !state.groups.some((group) => group.id === groupId)) return state;
  return { ...state, tabs: state.tabs.map((tab) => tab.id === tabId ? { ...tab, groupId } : tab) };
}

export function setSearch(state, key, patch = {}) {
  if (!SEARCH_KEYS.includes(key)) return state;
  const searches = { ...state.searches, [key]: normalizeSearch({ ...state.searches[key], ...patch }) };
  return { ...state, searches };
}

export function searchMatches(value, search = EMPTY_SEARCH) {
  const haystack = String(value ?? '');
  if (search.regex && search.pattern) {
    try { return new RegExp(search.pattern, search.flags || 'i').test(haystack); } catch { return false; }
  }
  return !search.query || haystack.toLocaleLowerCase().includes(String(search.query).toLocaleLowerCase());
}

export function searchTabs(state, key = 'master', groupId = null) {
  const search = state.searches[key] || EMPTY_SEARCH;
  const tabs = groupId == null ? state.tabs : state.tabs.filter((tab) => tab.groupId === groupId);
  return tabs.filter((tab) => searchMatches(`${tab.label} ${tab.route} ${tab.groupId || ''}`, search));
}

export function searchGroups(state) {
  const search = state.searches.groupNames || EMPTY_SEARCH;
  return state.groups.filter((group) => searchMatches(`${group.label} ${group.id}`, search));
}

export function visibleTabs(state, maxVisible = Infinity) {
  const ordered = state.tabs;
  if (!Number.isFinite(maxVisible) || ordered.length <= maxVisible) return { visible: ordered, overflow: [] };
  return { visible: ordered.slice(0, Math.max(0, maxVisible - 1)), overflow: ordered.slice(Math.max(0, maxVisible - 1)) };
}

export function renderTabShell(root, state, onChange = () => {}) {
  if (!root) return;
  root.dataset.dock = state.dock;
  root.innerHTML = '';
  const strip = document.createElement('div'); strip.className = 'tabs-strip'; strip.setAttribute('role', 'tablist');
  state.tabs.forEach((tab) => {
    const button = document.createElement('button'); button.className = 'tabs-tab'; button.type = 'button'; button.dataset.tabId = tab.id; button.setAttribute('role', 'tab'); button.setAttribute('aria-selected', String(tab.id === state.activeTab)); button.textContent = `${tab.pinned ? '📌 ' : ''}${tab.label}`;
    button.addEventListener('click', () => onChange(activateTab(state, tab.id))); strip.append(button);
  });
  root.append(strip);
  return strip;
}
