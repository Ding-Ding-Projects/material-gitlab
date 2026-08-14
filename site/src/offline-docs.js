import catalog from '../data/docs-catalog.json' with { type: 'json' };

export const OFFLINE_DOCS = Object.freeze(catalog.documents.map((doc) => Object.freeze({ ...doc })));
export function searchOfflineDocs(query = '', { regex = false, flags = 'i' } = {}) {
  const value = String(query);
  if (!value) return [...OFFLINE_DOCS];
  let matcher;
  try { matcher = regex ? new RegExp(value, flags) : new RegExp(value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), flags); } catch { return []; }
  return OFFLINE_DOCS.filter((doc) => matcher.test(`${doc.title}\n${doc.body}`));
}
export function getOfflineDoc(id) { return OFFLINE_DOCS.find((doc) => doc.id === id) || null; }
export function mountOfflineDocs(root, { onSelect = () => {} } = {}) {
  if (!root) return () => {};
  const render = (docs) => { root.innerHTML = docs.map((doc) => `<article tabindex="0" data-doc-id="${doc.id}"><h3>${doc.title}</h3><p>${doc.summary}</p><button type="button" data-doc-open="${doc.id}">Read offline</button></article>`).join(''); };
  const search = root.querySelector('[data-offline-doc-search]');
  const update = () => render(searchOfflineDocs(search?.value || ''));
  search?.addEventListener('input', update);
  root.addEventListener('click', (event) => { const id = event.target.closest('[data-doc-open]')?.dataset.docOpen; if (id) onSelect(getOfflineDoc(id)); });
  render(OFFLINE_DOCS);
  return () => search?.removeEventListener('input', update);
}
