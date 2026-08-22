/** Local-only Ollama suite state and adapter contracts.
 * No network client lives here: callers provide a privileged, already-local transport.
 */
const freeze = (value) => Object.freeze(value);

export const OLLAMA_STATES = freeze(['missing', 'stopped', 'unhealthy', 'healthy', 'offline']);
export const FIT_VERDICTS = freeze(['Runs well', 'Runs with limits', 'Unlikely', 'Unknown']);

export function createOllamaManager({ transport = null, storage = null, now = () => new Date().toISOString() } = {}) {
  const state = {
    health: { state: 'offline', checkedAt: null, version: null, detail: 'No local Ollama transport configured.' },
    models: [], installed: [], pulls: [], chats: [], harnesses: [], catalog: null,
  };
  const persist = () => storage?.setItem?.('material-gitlab.ollama-state.v1', JSON.stringify({ ...state, health: { ...state.health } }));
  const call = async (method, payload = {}) => {
    if (!transport || typeof transport[method] !== 'function') throw new Error(`Local Ollama transport unavailable for ${method}.`);
    return transport[method](payload);
  };
  const diagnose = (error) => ({ state: error?.code === 'MISSING' ? 'missing' : error?.code === 'STOPPED' ? 'stopped' : 'unhealthy', checkedAt: now(), version: null, detail: String(error?.message || error) });
  return {
    snapshot: () => structuredClone(state),
    async checkHealth() { try { const result = await call('health'); state.health = { state: 'healthy', checkedAt: now(), version: result?.version ?? null, detail: 'Local Ollama API is healthy.' }; } catch (error) { state.health = diagnose(error); } persist(); return { ...state.health }; },
    diagnosis() { return { ...state.health, recovery: state.health.state === 'healthy' ? 'Ready for local model operations.' : 'Use the bundled offline help and local retry action.' }; },
    async refreshInstalled() { const result = await call('listModels'); state.installed = Array.isArray(result?.models) ? result.models : []; persist(); return [...state.installed]; },
    reconcileCatalog(catalog) { state.catalog = catalog && Array.isArray(catalog.models) ? { ...catalog, models: [...catalog.models] } : null; state.models = state.catalog?.models ?? []; return [...state.models]; },
    fitVerdict(model, hardware = {}) { if (!model?.sizeBytes || !hardware?.freeDiskBytes) return 'Unknown'; if (hardware.freeDiskBytes < model.sizeBytes * 1.2) return 'Unlikely'; if (hardware.ramBytes && model.sizeBytes < hardware.ramBytes * 0.5) return 'Runs well'; return 'Runs with limits'; },
    async queuePull(tag, options = {}) { if (!tag || typeof tag !== 'string') throw new TypeError('A verified model tag is required.'); const item = { id: crypto.randomUUID?.() || `${Date.now()}-${tag}`, tag, status: 'queued', progress: 0, ...options }; state.pulls.push(item); persist(); return { ...item }; },
    async runPull(id) { const item = state.pulls.find((pull) => pull.id === id); if (!item) throw new Error('Pull item not found.'); item.status = 'running'; persist(); try { const result = await call('pull', { tag: item.tag, onProgress: (progress) => { item.progress = Math.max(0, Math.min(1, Number(progress) || 0)); } }); item.status = 'pulled'; item.progress = 1; item.result = result ?? null; } catch (error) { item.status = 'failed'; item.error = String(error?.message || error); } persist(); return { ...item }; },
    async chat({ model, prompt, system = '', parameters = {} }) { if (!model || !prompt) throw new TypeError('A model and prompt are required.'); const session = { id: crypto.randomUUID?.() || String(Date.now()), model, system, parameters: { ...parameters }, prompt, status: 'running', createdAt: now() }; state.chats.push(session); try { session.response = await call('chat', { model, prompt, system, parameters }); session.status = 'complete'; } catch (error) { session.status = 'failed'; session.error = String(error?.message || error); } persist(); return { ...session }; },
    registerHarness(profile) { const allowed = profile && typeof profile.name === 'string' && Array.isArray(profile.args) && profile.args.every((arg) => typeof arg === 'string') && typeof profile.executable === 'string' && !/[;&|`$<>]/.test(profile.executable); if (!allowed) throw new TypeError('Harness must use a picked executable and an allowlisted argument array.'); const saved = { ...profile, id: profile.id || (crypto.randomUUID?.() || String(Date.now())) }; state.harnesses.push(saved); persist(); return { ...saved }; },
    offlineState() { return state.health.state !== 'healthy' ? { usable: true, message: 'Ollama is unavailable; installed-model records, saved chats, harness profiles, and bundled help remain local.' } : { usable: true, message: 'Local Ollama operations available.' }; },
  };
}

export const createOllamaAdapter = (transport) => createOllamaManager({ transport });
