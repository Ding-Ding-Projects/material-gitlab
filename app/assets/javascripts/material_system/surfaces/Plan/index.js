/**
 * Entry point for the Plan surface (milestones, iterations, wiki, requirements).
 * Ported from design/Plan.dc.html.
 */
import Vue from 'vue';
import Plan from './Plan.vue';
import { createProjectPlanProps } from './data';

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
 * fetch* functions to point the surface at a server-backed API.
 */
export function mountPlan(el, props = {}) {
  const mountEl = typeof el === 'string' ? document.querySelector(el) : el;
  if (!mountEl) return null;
  if (mountEl.dataset.materialPlan) {
    window.__MATERIAL_PLAN_ENDPOINTS__ = { ...window.__MATERIAL_PLAN_ENDPOINTS__, ...mountEl.dataset };
  }
  const projectId = props.projectId || mountEl.dataset.projectId || mountEl.dataset.materialPlanProjectId;
  const permissions = props.permissions || {
    milestones: mountEl.dataset.canManageMilestones === 'true',
    wiki: mountEl.dataset.canManageWiki === 'true',
  };
  const adapterProps = props.adapter ? props.adapter : projectId ? createProjectPlanProps({ projectId, root: mountEl, permissions }) : {};
  return new Vue({
    name: 'PlanRoot',
    render: (h) => h(Plan, { props: { ...adapterProps, newMilestonePath: mountEl.dataset.newMilestonePath || '', wikiPath: mountEl.dataset.wikiPath || '', avatarInitials: mountEl.dataset.avatarInitials || '', ...props } }),
  }).$mount(mountEl);
}

export default Plan;
