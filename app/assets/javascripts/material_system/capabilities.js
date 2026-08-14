export const CAPABILITY_CONTRACTS = Object.freeze([
  {
    id: 'locks',
    requiredMethods: ['createLock', 'unlock', 'removeLock'],
    unavailableReason: 'Lock credential adapter is not registered',
  },
  {
    id: 'authenticator',
    requiredMethods: ['register', 'currentCode', 'remove'],
    unavailableReason: 'Authenticator vault adapter is not registered',
  },
  {
    id: 'supportTickets',
    requiredMethods: ['createTicket', 'openApplicationDataFolder'],
    unavailableReason: 'Support Tickets platform adapter is not registered',
  },
  {
    id: 'fileConverter',
    requiredMethods: ['convert', 'validateOutput'],
    unavailableReason: 'File converter adapter is not registered',
  },
  {
    id: 'ollama',
    requiredMethods: ['health', 'models', 'pull', 'chat'],
    unavailableReason: 'Ollama local API adapter is not registered',
  },
  {
    id: 'browserDownload',
    requiredMethods: ['start', 'pause', 'resume', 'cancel'],
    unavailableReason: 'Browser download adapter is not registered',
  },
]);

const CONTRACTS = new Map(CAPABILITY_CONTRACTS.map((contract) => [contract.id, contract]));

export function createCapabilityRegistry({ adapters = {} } = {}) {
  const registrations = new Map();
  const listeners = new Set();
  const snapshot = () =>
    CAPABILITY_CONTRACTS.map((contract) => {
      const registration = registrations.get(contract.id);
      return registration
        ? { id: contract.id, status: 'available', metadata: { ...registration.metadata } }
        : { id: contract.id, status: 'unavailable', reason: contract.unavailableReason };
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
    registerCapabilityAdapter(id, adapter, metadata = {}) {
      const contract = CONTRACTS.get(id);
      if (!contract) throw new Error(`Unknown capability: ${id}`);
      const missing = contract.requiredMethods.filter(
        (method) => typeof adapter?.[method] !== 'function',
      );
      if (missing.length)
        throw new Error(`${id} adapter is missing methods: ${missing.join(', ')}`);
      registrations.set(id, { adapter, metadata });
      emit();
      return () => api.unregisterCapabilityAdapter(id);
    },
    unregisterCapabilityAdapter(id) {
      const removed = registrations.delete(id);
      if (removed) emit();
      return removed;
    },
    status(id) {
      const contract = CONTRACTS.get(id);
      if (!contract) return { id, status: 'unknown', reason: `Unknown capability: ${id}` };
      const registration = registrations.get(id);
      return registration
        ? { id, status: 'available', metadata: { ...registration.metadata } }
        : { id, status: 'unavailable', reason: contract.unavailableReason };
    },
    async invoke(id, method, ...args) {
      const contract = CONTRACTS.get(id);
      const registration = registrations.get(id);
      if (!contract) return { ok: false, status: 'unknown', reason: `Unknown capability: ${id}` };
      if (!registration)
        return { ok: false, status: 'unavailable', reason: contract.unavailableReason };
      if (typeof registration.adapter[method] !== 'function')
        return { ok: false, status: 'unsupported', reason: `${id}.${method} is not registered` };
      return registration.adapter[method](...args);
    },
    dispose() {
      registrations.clear();
      listeners.clear();
    },
  });
  Object.entries(adapters).forEach(([id, value]) => api.registerCapabilityAdapter(id, value));
  return api;
}

export const registerCapabilityAdapter = (registry, id, adapter, metadata) =>
  registry.registerCapabilityAdapter(id, adapter, metadata);
