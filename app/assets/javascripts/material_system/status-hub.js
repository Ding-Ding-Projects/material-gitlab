const UNAVAILABLE_REASON = 'Status Hub adapter is not registered';
const clone = (value) => JSON.parse(JSON.stringify(value));

export function createStatusHubAdapter({ adapter = null, project = null } = {}) {
  let transport = adapter;
  let state = {
    status: adapter ? 'ready' : 'unavailable',
    reason: adapter ? null : UNAVAILABLE_REASON,
    project,
    session: null,
    lastUpdate: null,
    evidence: [],
  };
  const listeners = new Set();
  const snapshot = () => clone(state);
  const emit = () => listeners.forEach((listener) => listener(snapshot()));

  async function invoke(method, payload) {
    if (!transport || typeof transport[method] !== 'function') {
      state = { ...state, status: 'unavailable', reason: UNAVAILABLE_REASON };
      emit();
      return { ok: false, status: 'unavailable', reason: UNAVAILABLE_REASON };
    }
    try {
      const result = await transport[method](clone(payload));
      if (!result || result.ok !== true) {
        const reason = result?.reason || `Status Hub ${method} was not accepted`;
        state = { ...state, status: result?.status || 'failed', reason };
        emit();
        return { ok: false, status: state.status, reason };
      }
      state = { ...state, status: 'ready', reason: null };
      emit();
      return result;
    } catch (error) {
      state = {
        ...state,
        status: 'failed',
        reason: error.message || `Status Hub ${method} failed`,
      };
      emit();
      return { ok: false, status: 'failed', reason: state.reason };
    }
  }

  return Object.freeze({
    snapshot,
    subscribe(listener) {
      if (typeof listener !== 'function') return () => {};
      listeners.add(listener);
      listener(snapshot());
      return () => listeners.delete(listener);
    },
    setAdapter(nextAdapter) {
      transport = nextAdapter;
      state = {
        ...state,
        status: transport ? 'ready' : 'unavailable',
        reason: transport ? null : UNAVAILABLE_REASON,
      };
      emit();
      return snapshot();
    },
    async registerProject(nextProject) {
      const result = await invoke('registerProject', nextProject);
      if (result.ok) state = { ...state, project: clone(nextProject) };
      emit();
      return result;
    },
    async registerSession(session) {
      const result = await invoke('registerSession', session);
      if (result.ok) state = { ...state, session: clone(session) };
      emit();
      return result;
    },
    async updateStatus(update) {
      const result = await invoke('updateStatus', update);
      if (result.ok) state = { ...state, lastUpdate: clone(update) };
      emit();
      return result;
    },
    async publishEvidence(evidence) {
      const result = await invoke('publishEvidence', evidence);
      if (result.ok)
        state = { ...state, evidence: [...state.evidence, clone(evidence)].slice(-100) };
      emit();
      return result;
    },
    dispose: () => listeners.clear(),
  });
}
