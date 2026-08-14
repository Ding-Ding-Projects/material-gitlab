export function createBulkSelection(items = []) {
  const selected = new Set();
  return {
    items: () => items,
    selected: () => items.filter((item) => selected.has(item.id)),
    toggle(id, checked = !selected.has(id)) { checked ? selected.add(id) : selected.delete(id); return this.selected(); },
    selectAll() { items.forEach((item) => selected.add(item.id)); return this.selected(); },
    clear() { selected.clear(); return []; },
    preview(action, predicate = () => true) { const affected = this.selected().filter(predicate); return { action: String(action), selected: this.selected().length, affected: affected.length, items: affected }; },
    apply(action, handler, predicate = () => true) { const preview = this.preview(action, predicate); if (typeof handler === 'function') preview.results = preview.items.map(handler); return preview; },
  };
}

export function selectionFromCheckboxes(container) {
  const boxes = () => [...(container?.querySelectorAll('input[type="checkbox"][data-item-id]') || [])];
  return { selected: () => boxes().filter((box) => box.checked).map((box) => box.dataset.itemId), selectAll: (value = true) => boxes().forEach((box) => { box.checked = value; }), preview: (action) => ({ action, selected: boxes().filter((box) => box.checked).length, ids: boxes().filter((box) => box.checked).map((box) => box.dataset.itemId) }) };
}
