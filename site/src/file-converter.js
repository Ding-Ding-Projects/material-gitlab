/** Offline converter catalog and bounded queue helpers. Adapters never become enabled without bundled proof. */
export const MAX_FILE_BYTES = 256 * 1024 * 1024;
export const MAX_QUEUE_ITEMS = Number.POSITIVE_INFINITY;

export function normalizeAdapter(adapter = {}) {
  return { id: String(adapter.id || ''), category: String(adapter.category || 'Binary Encodings'), sourceMime: Array.isArray(adapter.sourceMime) ? adapter.sourceMime.map(String) : [], targetMime: Array.isArray(adapter.targetMime) ? adapter.targetMime.map(String) : [], extensions: Array.isArray(adapter.extensions) ? adapter.extensions.map(String) : [], bundled: adapter.bundled === true, reason: adapter.bundled === true ? '' : String(adapter.reason || 'Adapter is not bundled in this application.') };
}
export function buildAdapterCatalog(records = []) {
  return records.map(normalizeAdapter).filter((adapter) => adapter.id).reduce((catalog, adapter) => { catalog[adapter.id] = adapter; return catalog; }, {});
}
export function findAdapters(catalog, sourceMime, targetMime) { return Object.values(catalog || {}).filter((adapter) => adapter.bundled && adapter.sourceMime.includes(sourceMime) && (!targetMime || adapter.targetMime.includes(targetMime))); }

export async function detectFileType(file, signatures = []) {
  if (!file || typeof file.slice !== 'function') throw new Error('Choose a local file.');
  if (Number(file.size) > MAX_FILE_BYTES) throw new Error('File exceeds the local conversion size limit.');
  const bytes = new Uint8Array(await file.slice(0, 32).arrayBuffer());
  return signatures.find((signature) => signature.bytes.every((value, index) => bytes[index] === value)) || { mime: file.type || 'application/octet-stream', extension: '', detected: false };
}

export function createConversionQueue(items = [], { onProgress = () => {}, concurrency = 2 } = {}) {
  const queue = items.map((item, index) => ({ id: item.id || `item-${index + 1}`, file: item.file || item, state: 'queued', progress: 0 }));
  let cancelled = false;
  return { items: queue, cancel() { cancelled = true; }, async run(convert) { let cursor = 0; const worker = async () => { while (!cancelled) { const item = queue[cursor++]; if (!item) return; item.state = 'running'; onProgress({ ...item }); try { item.result = await convert(item.file, item); item.progress = 100; item.state = 'converted'; } catch (error) { item.state = 'failed'; item.error = String(error.message || error); } onProgress({ ...item }); } }; await Promise.all(Array.from({ length: Math.max(1, Math.min(8, concurrency)) }, worker)); return queue; } };
}

export default { normalizeAdapter, buildAdapterCatalog, findAdapters, detectFileType, createConversionQueue };
