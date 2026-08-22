import { RegexBuilder } from './regex-builder';

export const FILE_CONVERTER_CATEGORIES = Object.freeze([
  'documents-pdf',
  'images',
  'audio',
  'video',
  'archives',
  'structured-data-spreadsheets',
  'code-text',
  'binary-encodings',
]);
export const FILE_CONVERTER_LIMITS = Object.freeze({
  concurrency: 2,
  pageSize: 100,
  inputBytes: 1024 * 1024 * 1024,
  outputBytes: 1024 * 1024 * 1024,
});

const ADAPTER_ID = /^(?:adapter|converter)\.[a-z0-9]+(?:[-.][a-z0-9]+)*$/;
const clonePublicAdapter = ({ convert, validateOutput, ...adapter }) => ({ ...adapter });

function normalizeAdapter(adapter) {
  const sources =
    adapter.sources || (adapter.sourceSignatures || []).map((signature) => ({ signature }));
  const targets = adapter.targets || (adapter.targetFormat ? [adapter.targetFormat] : []);
  const available =
    adapter.available === true &&
    adapter.bundled === true &&
    typeof adapter.packagedArtifactProof === 'string' &&
    adapter.packagedArtifactProof.trim() &&
    typeof adapter.convert === 'function' &&
    typeof adapter.validateOutput === 'function';
  return {
    ...adapter,
    sources: [...sources],
    targets: [...targets],
    available,
    unavailableReason: available
      ? null
      : adapter.unavailableReason ||
        'Bundled packaged-artifact proof and converter implementation are required',
    status: available ? 'available' : 'unavailable',
    reason: available
      ? null
      : adapter.unavailableReason ||
        'Bundled packaged-artifact proof and converter implementation are required',
  };
}

export function createFileConversionQueue({
  registry,
  store = null,
  concurrency = FILE_CONVERTER_LIMITS.concurrency,
} = {}) {
  const listeners = new Set();
  const active = new Map();
  let paused = false;
  let cancelled = false;
  let running = false;
  const storeReady =
    store &&
    ['append', 'claimNext', 'update', 'countByStatus'].every(
      (method) => typeof store[method] === 'function',
    );
  let state = {
    status: storeReady ? 'idle' : 'unavailable',
    reason: storeReady ? null : 'Persistent paged conversion queue store is not registered',
    counts: {},
    active: [],
  };
  const snapshot = () => ({
    ...state,
    counts: { ...state.counts },
    active: [...state.active],
    paused,
    running,
  });
  const emit = () => listeners.forEach((listener) => listener(snapshot()));

  async function refresh() {
    if (storeReady)
      state = { ...state, counts: await store.countByStatus(), active: [...active.keys()] };
    emit();
  }

  async function worker() {
    while (running && !paused && !cancelled) {
      const item = await store.claimNext();
      if (!item) return;
      const adapter = registry.getAdapter(item.adapterId);
      if (!adapter?.available) {
        await store.update(item.id, {
          status: 'failed',
          reason: adapter?.unavailableReason || 'Converter adapter is unavailable',
        });
        continue;
      }
      const controller = new AbortController();
      active.set(item.id, controller);
      await store.update(item.id, { status: 'running', startedAt: new Date().toISOString() });
      await refresh();
      try {
        const output = await adapter.convert({
          ...item,
          signal: controller.signal,
          limits: adapter.limits || FILE_CONVERTER_LIMITS,
        });
        const validated = await adapter.validateOutput(output, item);
        if (!validated?.ok)
          throw new Error(validated?.reason || 'Converted output validation failed');
        await store.update(item.id, {
          status: 'converted',
          completedAt: new Date().toISOString(),
          output: validated.metadata || null,
        });
      } catch (error) {
        const status = controller.signal.aborted ? 'cancelled' : 'failed';
        await store.update(item.id, {
          status,
          reason: controller.signal.aborted
            ? 'Conversion was cancelled'
            : error.message || 'Conversion failed',
        });
      } finally {
        active.delete(item.id);
        await refresh();
      }
    }
  }

  async function run() {
    if (!storeReady) return { ok: false, status: 'unavailable', reason: state.reason };
    running = true;
    cancelled = false;
    state = { ...state, status: 'running', reason: null };
    emit();
    await Promise.all(
      Array.from({ length: Math.max(1, Math.min(Number(concurrency) || 1, 8)) }, () => worker()),
    );
    running = false;
    if (!paused && !cancelled) state = { ...state, status: 'idle' };
    await refresh();
    return { ok: true, value: snapshot() };
  }

  return Object.freeze({
    snapshot,
    subscribe(listener) {
      if (typeof listener !== 'function') return () => {};
      listeners.add(listener);
      listener(snapshot());
      return () => listeners.delete(listener);
    },
    async add(items) {
      if (!storeReady) return { ok: false, status: 'unavailable', reason: state.reason };
      if (!items || typeof items[Symbol.iterator] !== 'function')
        return { ok: false, status: 'invalid', reason: 'Conversion items must be iterable' };
      let count = 0;
      let page = [];
      for (const item of items) {
        page.push({ ...item, status: 'pending' });
        count += 1;
        if (page.length >= FILE_CONVERTER_LIMITS.pageSize) {
          await store.append(page);
          page = [];
        }
      }
      if (page.length) await store.append(page);
      await refresh();
      return { ok: true, added: count };
    },
    start: run,
    async pause() {
      paused = true;
      state = { ...state, status: 'paused' };
      await refresh();
      return { ok: true };
    },
    async resume() {
      paused = false;
      return run();
    },
    async cancel(id) {
      if (id) {
        active.get(id)?.abort();
        await store?.update?.(id, { status: 'cancelled', reason: 'Conversion was cancelled' });
      } else {
        cancelled = true;
        active.forEach((controller) => controller.abort());
        state = { ...state, status: 'cancelled' };
      }
      await refresh();
      return { ok: true };
    },
    dispose() {
      cancelled = true;
      active.forEach((controller) => controller.abort());
      active.clear();
      listeners.clear();
    },
  });
}

export function createFileConverterRegistry({
  adapters = [],
  limits = FILE_CONVERTER_LIMITS,
} = {}) {
  const registrations = new Map();
  const searches = new Map(
    FILE_CONVERTER_CATEGORIES.map((category) => [category, new RegexBuilder()]),
  );
  const listeners = new Set();
  const snapshot = () => ({
    categories: FILE_CONVERTER_CATEGORIES.map((category) => ({
      category,
      search: searches.get(category).snapshot(),
      adapters: [...registrations.values()]
        .filter((adapter) => adapter.category === category)
        .map(clonePublicAdapter),
    })),
  });
  const emit = () => listeners.forEach((listener) => listener(snapshot()));

  const api = Object.freeze({
    snapshot,
    subscribe(listener) {
      if (typeof listener !== 'function') return () => {};
      listeners.add(listener);
      listener(snapshot());
      return () => listeners.delete(listener);
    },
    registerAdapter(adapter) {
      if (
        !adapter ||
        !ADAPTER_ID.test(adapter.id || '') ||
        !FILE_CONVERTER_CATEGORIES.includes(adapter.category)
      )
        throw new Error(
          'Converter adapter requires a stable adapter.* or converter.* id and canonical category',
        );
      if (registrations.has(adapter.id))
        throw new Error(`Converter adapter is already registered: ${adapter.id}`);
      const normalized = normalizeAdapter(adapter);
      registrations.set(adapter.id, normalized);
      emit();
      return () => api.unregisterAdapter(adapter.id);
    },
    unregisterAdapter(id) {
      const removed = registrations.delete(id);
      if (removed) emit();
      return removed;
    },
    getAdapter: (id) => registrations.get(id),
    listAdapters({ category, available } = {}) {
      return [...registrations.values()]
        .filter(
          (adapter) =>
            (!category || adapter.category === category) &&
            (available === undefined || adapter.available === available),
        )
        .map(clonePublicAdapter);
    },
    matchAdapters(source = {}) {
      return [...registrations.values()]
        .filter((adapter) =>
          adapter.sources.some(
            (matcher) =>
              matcher.mimeType === source.mimeType || matcher.signature === source.signature,
          ),
        )
        .map(clonePublicAdapter);
    },
    setCategorySearch(category, patch) {
      const builder = searches.get(category);
      if (!builder)
        return { ok: false, status: 'missing', reason: `Unknown converter category: ${category}` };
      const search = builder.update(patch);
      const plain = search.pattern.toLocaleLowerCase();
      let expression;
      if (search.regex) {
        try {
          expression = new RegExp(search.pattern, search.flags.replace(/[gy]/g, ''));
        } catch (_error) {
          expression = null;
        }
      }
      const results = api
        .listAdapters({ category })
        .filter((adapter) =>
          expression
            ? expression.test(`${adapter.id} ${(adapter.targets || []).join(' ')}`)
            : `${adapter.id} ${(adapter.targets || []).join(' ')}`
                .toLocaleLowerCase()
                .includes(plain),
        );
      return { ok: search.syntax.valid, search, results };
    },
    createQueue(options = {}) {
      return createFileConversionQueue({ registry: api, ...options, limits });
    },
  });
  adapters.forEach((adapter) => api.registerAdapter(adapter));
  return api;
}
