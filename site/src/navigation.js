/**
 * Browser-style navigation state for the documentation shell.
 *
 * The module is deliberately DOM-free: the application can render the exported
 * state with any view layer while keeping tab, search, regex-builder and command
 * palette behaviour in one place.
 */

export const DEFAULT_NAVIGATION_STATE = Object.freeze({
  dock: 'left',
  activeTab: 'overview',
  tabs: [],
  tabQuery: '',
  tabRegex: { enabled: false, pattern: '', flags: 'i', error: '' },
  settingsQuery: '',
  settingsRegex: { enabled: false, pattern: '', flags: 'i', error: '' },
  palette: { open: false, query: '', regex: { enabled: false, pattern: '', flags: 'i', error: '' } },
});

const DOCKS = new Set(['left', 'right', 'top', 'bottom']);
const clone = (value) => JSON.parse(JSON.stringify(value));

export function createNavigationState(metadata = {}) {
  const tabs = Array.isArray(metadata.tabs) ? metadata.tabs.map(normalizeTab) : [];
  const activeTab = metadata.activeTab || tabs[0]?.id || DEFAULT_NAVIGATION_STATE.activeTab;
  return {
    ...clone(DEFAULT_NAVIGATION_STATE),
    dock: DOCKS.has(metadata.dock) ? metadata.dock : DEFAULT_NAVIGATION_STATE.dock,
    activeTab,
    tabs,
    tabRegex: clone(DEFAULT_NAVIGATION_STATE.tabRegex),
    settingsRegex: clone(DEFAULT_NAVIGATION_STATE.settingsRegex),
    palette: clone(DEFAULT_NAVIGATION_STATE.palette),
  };
}

function normalizeTab(tab) {
  return {
    id: String(tab.id),
    label: String(tab.label || tab.id),
    group: tab.group ? String(tab.group) : null,
    pinned: Boolean(tab.pinned),
    route: tab.route ? String(tab.route) : `#${tab.id}`,
  };
}

function updateRegex(state, key, patch) {
  const next = { ...state[key], ...patch, error: '' };
  if (next.enabled && next.pattern) {
    try { new RegExp(next.pattern, next.flags); }
    catch (error) { next.error = error.message; }
  }
  return { ...state, [key]: next };
}

export function setDock(state, dock) {
  if (!DOCKS.has(dock)) return state;
  return { ...state, dock };
}

export function activateTab(state, tabId) {
  return state.tabs.some((tab) => tab.id === tabId) ? { ...state, activeTab: tabId } : state;
}

export function setTabQuery(state, query) {
  return { ...state, tabQuery: String(query ?? '') };
}

export function setTabRegex(state, patch) {
  return updateRegex(state, 'tabRegex', patch);
}

export function setSettingsQuery(state, query) {
  return { ...state, settingsQuery: String(query ?? '') };
}

export function setSettingsRegex(state, patch) {
  return updateRegex(state, 'settingsRegex', patch);
}

export function toggleCommandPalette(state, open = !state.palette.open) {
  return { ...state, palette: { ...state.palette, open: Boolean(open) } };
}

export function setPaletteQuery(state, query) {
  return { ...state, palette: { ...state.palette, query: String(query ?? '') } };
}

export function setPaletteRegex(state, patch) {
  return { ...state, palette: updateRegex(state.palette, 'regex', patch).regex };
}

export function matches(value, query, regex = { enabled: false, pattern: '', flags: 'i' }) {
  const haystack = String(value ?? '');
  if (!query && !(regex.enabled && regex.pattern)) return true;
  if (regex.enabled && regex.pattern) {
    try { return new RegExp(regex.pattern, regex.flags).test(haystack); }
    catch { return false; }
  }
  return haystack.toLocaleLowerCase().includes(String(query).toLocaleLowerCase());
}

export function filterTabs(state) {
  return state.tabs.filter((tab) => matches(`${tab.label} ${tab.group || ''}`, state.tabQuery, state.tabRegex));
}

export function filterSettings(items, state) {
  return (items || []).filter((item) => matches(`${item.label || ''} ${item.description || ''}`, state.settingsQuery, state.settingsRegex));
}

export function filterPalette(items, state) {
  return (items || []).filter((item) => matches(`${item.label || ''} ${item.description || ''}`, state.palette.query, state.palette.regex));
}

export function bindNavigationKeyboard(target, getState, dispatch) {
  const handler = (event) => {
    if (event.ctrlKey && event.shiftKey && event.key.toLowerCase() === 'f') {
      event.preventDefault();
      dispatch(toggleCommandPalette(getState(), true));
    }
  };
  target.addEventListener('keydown', handler);
  return () => target.removeEventListener('keydown', handler);
}
