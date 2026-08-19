import Vue from 'vue';
import Epics from './Epics.vue';

export { default as Epics } from './Epics.vue';
export * from './data';

/** Mounts the design-contract Epics surface using routes supplied by the server. */
export function mountEpics(el, props = {}) {
  const mountEl = typeof el === 'string' ? document.querySelector(el) : el;
  if (!mountEl) return null;
  if (mountEl.dataset.materialEpics) {
    window.__MATERIAL_EPICS_CONFIG__ = { ...window.__MATERIAL_EPICS_CONFIG__, ...mountEl.dataset };
  }
  return new Vue({
    name: 'EpicsRoot',
    render: (h) => h(Epics, { props }),
  }).$mount(mountEl);
}

export default Epics;
