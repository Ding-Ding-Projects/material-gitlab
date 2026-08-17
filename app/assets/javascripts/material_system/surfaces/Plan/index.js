/**
 * Entry point for the Plan surface (milestones, iterations, wiki, requirements).
 * Ported from design/Plan.dc.html.
 */
import Vue from 'vue';
import Plan from './Plan.vue';

export { default as Plan } from './Plan.vue';
export { default as TopBar } from './components/TopBar.vue';
export { default as PlanTabs } from './components/PlanTabs.vue';
export { default as RecordList } from './components/RecordList.vue';
export { default as RecordRow } from './components/RecordRow.vue';
export { default as WikiPanel } from './components/WikiPanel.vue';
export { default as RegexBuilderPopover } from './components/RegexBuilderPopover.vue';
export { default as CommandPaletteOverlay } from './components/CommandPaletteOverlay.vue';
export { default as ConfirmDialog } from './components/ConfirmDialog.vue';
export { default as MdsIcon } from './components/MdsIcon.vue';

export * from './data';
export * from './regexPlanSearch';

/**
 * Mounts the Plan surface into `el`. `props` may override any of Plan's
 * fetch* functions to point the surface at a real API instead of the
 * bundled mock data.
 */
export function mountPlan(el, props = {}) {
  const mountEl = typeof el === 'string' ? document.querySelector(el) : el;
  if (!mountEl) return null;
  return new Vue({
    name: 'PlanRoot',
    render: (h) => h(Plan, { props }),
  }).$mount(mountEl);
}

export default Plan;
