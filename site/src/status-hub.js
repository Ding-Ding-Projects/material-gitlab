/**
 * Truthful, local Status Hub registration state. This module models evidence;
 * it does not contact a Hub or imply that a record was delivered remotely.
 */

export const STATUS_STORAGE_KEY = 'material-gitlab.status-hub.v1';
export const STATUS_SCHEMA_VERSION = 1;
export const STATUS_STATES = Object.freeze(['unregistered', 'registered', 'pending', 'verified', 'unavailable']);

function storageOf(storage) {
  if (storage) return storage;
  try { return globalThis.localStorage; } catch { return null; }
}

function now() { return new Date().toISOString(); }

function read(storage) {
  const store = storageOf(storage);
  if (!store) return null;
  try { return JSON.parse(store.getItem(STATUS_STORAGE_KEY) || 'null'); } catch { return null; }
}

function write(value, storage) {
  const store = storageOf(storage);
  if (store) {
    try { store.setItem(STATUS_STORAGE_KEY, JSON.stringify(value)); } catch { /* local storage can be disabled */ }
  }
  return value;
}

export function emptyStatusHubState() {
  return {
    schemaVersion: STATUS_SCHEMA_VERSION,
    state: 'unregistered',
    registeredAt: null,
    updatedAt: now(),
    project: null,
    evidence: {},
    delivery: { attempted: false, delivered: false, reason: 'No remote registration attempted.' },
  };
}

export function getStatusHubState(storage) {
  const value = read(storage);
  if (!value || value.schemaVersion !== STATUS_SCHEMA_VERSION || !STATUS_STATES.includes(value.state)) return emptyStatusHubState();
  return { ...emptyStatusHubState(), ...value, evidence: { ...(value.evidence || {}) }, delivery: { ...emptyStatusHubState().delivery, ...(value.delivery || {}) } };
}

export function registerStatusHubProject(project, storage) {
  if (!project || typeof project !== 'object' || !project.repository) throw new Error('A repository is required for Status Hub registration.');
  const current = getStatusHubState(storage);
  const value = {
    ...current,
    state: 'registered',
    registeredAt: current.registeredAt || now(),
    updatedAt: now(),
    project: {
      repository: String(project.repository),
      defaultBranch: String(project.defaultBranch || 'main'),
      releaseChannel: String(project.releaseChannel || 'unreleased'),
      statusUrl: project.statusUrl ? String(project.statusUrl) : null,
    },
    delivery: { attempted: false, delivered: false, reason: 'Registration recorded locally; remote delivery has not been attempted.' },
  };
  return write(value, storage);
}

export function updateStatusEvidence(evidence, storage) {
  const current = getStatusHubState(storage);
  const nextEvidence = { ...current.evidence, ...(evidence || {}) };
  const state = Object.values(nextEvidence).some((item) => item?.state === 'failed') ? 'unavailable'
    : Object.values(nextEvidence).length && Object.values(nextEvidence).every((item) => item?.state === 'verified') ? 'verified' : 'pending';
  return write({ ...current, state, updatedAt: now(), evidence: nextEvidence }, storage);
}

export function setStatusDelivery(delivery, storage) {
  const current = getStatusHubState(storage);
  const attempted = Boolean(delivery?.attempted);
  const delivered = Boolean(delivery?.delivered);
  return write({ ...current, updatedAt: now(), delivery: { attempted, delivered, reason: String(delivery?.reason || (delivered ? 'Remote delivery confirmed.' : 'Remote delivery is unverified.')) } }, storage);
}

export function clearStatusHubRegistration(storage) {
  const store = storageOf(storage);
  try { store?.removeItem(STATUS_STORAGE_KEY); } catch { /* best effort */ }
  return emptyStatusHubState();
}

export function statusDocumentationMetadata() {
  return {
    feature: 'status-hub',
    implementation: 'site/src/status-hub.js',
    schema: STATUS_SCHEMA_VERSION,
    evidenceStates: STATUS_STATES,
    deliveryBoundary: 'local model only until an authenticated remote bridge confirms delivery',
  };
}

export default { emptyStatusHubState, getStatusHubState, registerStatusHubProject, updateStatusEvidence, setStatusDelivery, clearStatusHubRegistration, statusDocumentationMetadata };
