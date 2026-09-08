import Vue from 'vue';
import Epics from './Epics.vue';
import { loadEpics, mutateEpic, deleteEpic } from './data';

export { default as Epics } from './Epics.vue';
export * from './data';

/** Mounts the design-contract Epics surface using routes supplied by the server. */
export function mountEpics(el, props = {}) {
  const mountEl = typeof el === 'string' ? document.querySelector(el) : el;
  if (!mountEl) return null;
  let routeConfig = {};
  if (mountEl.dataset.materialEpics) {
    if (mountEl.dataset.materialEpicsConfig) {
      try {
        routeConfig = JSON.parse(mountEl.dataset.materialEpicsConfig);
      } catch (_error) {
        throw new Error('Epics route configuration is invalid. Reload the group Epics page.');
      }
    }
    if (!routeConfig.fullPath) throw new Error('Epics surface requires the server group path.');
  }
  const adapterProps = routeConfig.fullPath ? {
    fetchEpicsData: () => loadEpics(routeConfig),
    mutateEpic: ({ id, changes }) => mutateEpic({ id, changes, options: routeConfig }),
    deleteEpic: ({ id }) => deleteEpic({ id, options: routeConfig }),
  } : {};
  return new Vue({
    name: 'EpicsRoot',
    render: (h) => h(Epics, { props: { ...adapterProps, ...props } }),
  }).$mount(mountEl);
}

export default Epics;
