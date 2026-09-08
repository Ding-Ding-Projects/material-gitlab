import Vue from 'vue';
import Repository from './Repository.vue';
import { assertRepositoryAdapter, createProjectRepositoryAdapter } from './data';

export { default as Repository } from './Repository.vue';
export { assertRepositoryAdapter, normalizeRepositoryData, createRepositoryAdapter, createProjectRepositoryAdapter, createRailsRepositoryAdapter, createGraphqlRepositoryAdapter } from './data';

/**
 * Mounts the Repository surface onto `el`.
 * @param {Element|string} el - target element or selector.
 * @param {{ adapter: object }} propsData - required GraphQL/Rails-backed adapter.
 * @returns {Vue} the mounted Vue instance.
 */
export function mountRepositorySurface(el, propsData = {}) {
  const mountEl = typeof el === 'string' ? document.querySelector(el) : el;
  if (!mountEl) return null;
  const initialRef = propsData.initialRef ?? mountEl.dataset.ref ?? '';
  const initialPath = propsData.initialPath ?? mountEl.dataset.path ?? '';
  const initialKind = propsData.initialKind ?? mountEl.dataset.entryType ?? 'tree';
  const adapter = propsData.adapter || createProjectRepositoryAdapter({
    projectPath: propsData.projectPath || mountEl?.dataset?.projectPath,
    ref: initialRef,
    path: initialKind === 'blob' ? initialPath.split('/').slice(0, -1).join('/') : initialPath,
    initialStarred: mountEl.dataset.starred === 'true',
    forkPath: mountEl.dataset.forkPath || '',
    canStar: mountEl.dataset.canStar === 'true',
  });
  assertRepositoryAdapter(adapter);
  return new Vue({
    el: mountEl,
    render: (h) => h(Repository, { props: { ...propsData, adapter, initialRef, initialPath, initialKind } }),
  });
}

export default Repository;
