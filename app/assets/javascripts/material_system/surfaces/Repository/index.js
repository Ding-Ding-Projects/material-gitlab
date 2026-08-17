import Vue from 'vue';
import Repository from './Repository.vue';

export { default as Repository } from './Repository.vue';
export { createSampleRepositoryData } from './data';

/**
 * Mounts the Repository surface onto `el`.
 * @param {Element|string} el - target element or selector.
 * @param {{ initialData?: object }} [propsData] - optional real dataset, shaped like data.js.
 * @returns {Vue} the mounted Vue instance.
 */
export function mountRepositorySurface(el, propsData = {}) {
  return new Vue({
    el,
    render: (h) => h(Repository, { props: propsData }),
  });
}

export default Repository;
