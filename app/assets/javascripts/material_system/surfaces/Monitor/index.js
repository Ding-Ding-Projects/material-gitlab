import Vue from 'vue';
import Monitor from './Monitor.vue';
import '../operations.scss';
import { readSurfaceConfig, resolveSurfaceElement } from '../live-data';
export { default as MonitorSurface } from './Monitor.vue';
export * from './data';
export function mountMonitor(selector = '#js-material-monitor') {
  const el = resolveSurfaceElement(selector, '#js-material-monitor');
  if (!el) return null;
  return new Vue({ el, name: 'MaterialMonitorRoot', render: (h) => h(Monitor, { props: { endpoints: readSurfaceConfig(el) } }) });
}
export default mountMonitor;
