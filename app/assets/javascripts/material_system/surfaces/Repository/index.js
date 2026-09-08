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
  const adapter = propsData.adapter || createProjectRepositoryAdapter({
    projectPath: propsData.projectPath || mountEl?.dataset?.projectPath,
    ref: propsData.ref || mountEl?.dataset?.ref,
    path: propsData.path || mountEl?.dataset?.path,
  });
  assertRepositoryAdapter(adapter);
  return new Vue({
    el: mountEl,
    render: (h) => h(Repository, { props: { ...propsData, adapter } }),
  });
}

export default Repository;
