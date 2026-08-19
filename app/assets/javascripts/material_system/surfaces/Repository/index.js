import Vue from 'vue';
import Repository from './Repository.vue';
import { assertRepositoryAdapter } from './data';

export { default as Repository } from './Repository.vue';
export { assertRepositoryAdapter, normalizeRepositoryData, createRepositoryAdapter, createRailsRepositoryAdapter, createGraphqlRepositoryAdapter } from './data';

/**
 * Mounts the Repository surface onto `el`.
 * @param {Element|string} el - target element or selector.
 * @param {{ adapter: object }} propsData - required GraphQL/Rails-backed adapter.
 * @returns {Vue} the mounted Vue instance.
 */
export function mountRepositorySurface(el, propsData = {}) {
  assertRepositoryAdapter(propsData.adapter);
  return new Vue({
    el,
    render: (h) => h(Repository, { props: propsData }),
  });
}

export default Repository;
