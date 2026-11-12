// Persisted state for the left-docked tab strip.
//
// Every destination starts open as a tab. A fresh install opens all of them in page order;
// an update opens only destinations the strip has never offered before; a tab the user
// closed stays closed until they reopen it (one tab from the New tab catalog, or all of them
// with "Open every tab").

export const TAB_STRIP_STORAGE_KEY = 'material-system.tab-strip.v1';

const read = (storage) => {
  try {
    const value = JSON.parse(storage?.getItem?.(TAB_STRIP_STORAGE_KEY) || 'null');
    if (value && Array.isArray(value.seen) && Array.isArray(value.closed)) return value;
  } catch (_error) {
    /* a damaged record falls back to a fresh install */
  }
  return null;
};

export function createTabStripState(ids, { storage = globalThis.localStorage } = {}) {
  const saved = read(storage);
  const seen = new Set(saved ? saved.seen : []);
  const closed = new Set(saved ? saved.closed.filter((id) => seen.has(id)) : []);
  const collapsed = new Set(saved?.collapsed || []);
  ids.forEach((id) => seen.add(id));

  const persist = () => {
    try {
      storage?.setItem?.(
        TAB_STRIP_STORAGE_KEY,
        JSON.stringify({ seen: [...seen], closed: [...closed], collapsed: [...collapsed] }),
      );
      return true;
    } catch (_error) {
      return false;
    }
  };
  persist();

  return {
    isOpen: (id) => !closed.has(id),
    closedIds: () => ids.filter((id) => closed.has(id)),
    isCollapsed: (group) => collapsed.has(group),
    close(id) {
      closed.add(id);
      return persist();
    },
    open(id) {
      closed.delete(id);
      return persist();
    },
    openEvery() {
      closed.clear();
      return persist();
    },
    setCollapsed(group, value) {
      if (value) collapsed.add(group);
      else collapsed.delete(group);
      return persist();
    },
  };
}
