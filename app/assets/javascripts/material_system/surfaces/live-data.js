/**
 * Small, framework-neutral adapter for design surfaces.
 *
 * Production surfaces must receive data from Rails/GraphQL/REST.  This helper
 * deliberately has no fixture fallback: a missing endpoint is an explicit
 * loading/error state, never a fabricated row rendered as if it were live.
 */

export function resolveSurfaceElement(target, fallbackSelector) {
  if (target && typeof target === 'object' && target.nodeType === 1) return target;
  if (typeof target === 'string' && typeof document !== 'undefined') return document.querySelector(target);
  if (fallbackSelector && typeof document !== 'undefined') return document.querySelector(fallbackSelector);
  return null;
}

export function readSurfaceConfig(element, key = 'endpoints') {
  if (!element) return {};
  const raw = element.dataset?.[key] || element.getAttribute?.(`data-${key}`);
  if (!raw) return {};
  if (typeof raw === 'object') return raw;
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
  } catch (_error) {
    return {};
  }
}

export function requireEndpoint(endpoints, key) {
  const endpoint = endpoints?.[key];
  if (typeof endpoint !== 'string' || endpoint.trim() === '') {
    throw new Error(`Missing live endpoint: ${key}`);
  }
  return endpoint;
}

export async function requestJson(endpoint, options = {}) {
  const { fetchImpl: injectedFetch, headers: extraHeaders, ...requestOptions } = options;
  const fetchFunction = injectedFetch || globalThis.fetch;
  if (typeof fetchFunction !== 'function') throw new Error('Live data fetch is unavailable');
  const response = await fetchFunction(endpoint, {
    credentials: 'same-origin',
    headers: { Accept: 'application/json', ...(extraHeaders || {}) },
    ...requestOptions,
  });
  if (!response || !response.ok) {
    const status = response?.status ? ` (${response.status})` : '';
    throw new Error(`Live data request failed${status}`);
  }
  if (response.status === 204) return null;
  const payload = await response.json();
  if (payload && typeof payload === 'object' && !Array.isArray(payload)) {
    if (Array.isArray(payload.items)) return payload.items;
    if (Array.isArray(payload.nodes)) return payload.nodes;
    if (Array.isArray(payload.data)) return payload.data;
  }
  return payload;
}

export function assertCollection(payload, label) {
  if (!Array.isArray(payload)) throw new Error(`Live ${label} response was not a collection`);
  return payload;
}

export function parseSurfacePayload(element, key = 'payload') {
  if (!element) return null;
  const raw = element.dataset?.[key] || element.getAttribute?.(`data-${key}`);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch (_error) {
    return null;
  }
}
