/** Authenticated operations transport. Pagination and CSRF stay at this boundary. */
export async function operationsRequest(endpoint, { fetchImpl = globalThis.fetch, method = 'GET', body } = {}) {
  if (typeof endpoint !== 'string' || !endpoint.trim()) throw new Error('A live operations endpoint is required.');
  const origin = globalThis.location?.origin || 'http://localhost';
  const url = new URL(endpoint, origin);
  if (url.origin !== origin) throw new Error('Operations requests must stay on this GitLab instance.');
  const csrf = globalThis.document?.querySelector('meta[name="csrf-token"]')?.content;
  const response = await fetchImpl(url.pathname + url.search, {
    method,
    credentials: 'same-origin',
    headers: { Accept: 'application/json', ...(body === undefined ? {} : { 'Content-Type': 'application/json' }), ...(csrf ? { 'X-CSRF-Token': csrf } : {}) },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  if (!response?.ok) throw new Error(`Operations request failed (${response?.status || 'unavailable'}).`);
  return { payload: response.status === 204 ? null : await response.json(), headers: response.headers };
}

export async function operationsCollection(endpoint, options = {}) {
  let next = endpoint;
  const rows = [];
  const visited = new Set();
  while (next) {
    if (visited.has(next) || visited.size >= 100) throw new Error('The collection exceeds the pagination limit. Narrow the query and retry.');
    visited.add(next);
    const { payload, headers } = await operationsRequest(next, options);
    const items = options.unwrap ? options.unwrap(payload) : payload;
    if (!Array.isArray(items)) throw new Error('The operations response was not a collection.');
    rows.push(...items);
    const link = headers?.get?.('Link')?.match(/<([^>]+)>;\s*rel="next"/);
    const page = headers?.get?.('X-Next-Page');
    next = options.nextPage?.(payload, endpoint) || link?.[1] || '';
    if (!next && page) {
      const url = new URL(endpoint, globalThis.location?.origin || 'http://localhost');
      url.searchParams.set('page', page);
      next = url.pathname + url.search;
    }
  }
  return rows;
}

export async function operationsGraphql(endpoint, query, variables, options = {}) {
  const { payload } = await operationsRequest(endpoint, { ...options, method: 'POST', body: { query, variables } });
  if (payload?.errors?.length) throw new Error(payload.errors.map((error) => error.message).join('; '));
  if (!payload?.data) throw new Error('No authorized GraphQL data was returned.');
  return payload.data;
}

export async function operationsConnection(endpoint, query, variables, select, options = {}) {
  const rows = [];
  let after = null;
  const visited = new Set();
  do {
    const data = await operationsGraphql(endpoint, query, { ...variables, after }, options);
    const connection = select(data);
    if (!Array.isArray(connection?.nodes)) throw new Error('The requested collection is unavailable or not authorized.');
    rows.push(...connection.nodes);
    if (!connection.pageInfo?.hasNextPage) return rows;
    after = connection.pageInfo.endCursor;
    if (!after || visited.has(after) || visited.size >= 99) throw new Error('The GraphQL pagination limit was reached.');
    visited.add(after);
  } while (after);
  return rows;
}
