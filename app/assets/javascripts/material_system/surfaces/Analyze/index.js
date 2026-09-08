import Analyze, { createAnalyzeDataAdapter } from './Analyze.vue';
import Vue from 'vue';
import { readSurfaceConfig, resolveSurfaceElement } from '../live-data';
import { createProjectAnalyzeAdapter } from './data';

export const ANALYZE_SURFACE_ID = 'surface.analyze';
export { createAnalyzeDataAdapter };
export { default as Analyze } from './Analyze.vue';
export default Analyze;

export function mountAnalyze(selector = '#js-material-analyze') {
  const element = resolveSurfaceElement(selector, '#js-material-analyze');
  if (!element) return null;
  const endpoints = readSurfaceConfig(element);
  const dataAdapter = createProjectAnalyzeAdapter({ endpoints });
  return new Vue({ el: element, render: (h) => h(Analyze, { props: { dataAdapter, endpoints } }) });
}
