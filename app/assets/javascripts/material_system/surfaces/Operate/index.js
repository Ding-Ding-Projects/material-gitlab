import Vue from 'vue';
import Operate from './Operate.vue';
import '../operations.scss';
import { readSurfaceConfig, resolveSurfaceElement } from '../live-data';
export { default as OperateSurface } from './Operate.vue';
export * from './data';
export function mountOperate(selector = '#js-material-operate') {
  const el = resolveSurfaceElement(selector, '#js-material-operate');
  if (!el) return null;
  return new Vue({ el, name: 'MaterialOperateRoot', render: (h) => h(Operate, { props: { endpoints: readSurfaceConfig(el) } }) });
}
export default mountOperate;
