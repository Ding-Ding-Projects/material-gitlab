/**
 * Deploy surface entry point. Ported from design/Deploy.dc.html.
 * Covers Releases, Feature flags, Package registry, and Container registry.
 */

import Deploy from './Deploy.vue';
import Vue from 'vue';
import { readSurfaceConfig, resolveSurfaceElement, parseSurfacePayload } from '../live-data';

export default Deploy;
export { default as Deploy } from './Deploy.vue';

export { default as DeploySidebar } from './components/DeploySidebar.vue';
export { default as DeployTopBar } from './components/DeployTopBar.vue';
export { default as DeployTabs } from './components/DeployTabs.vue';
export { default as DeployRowList } from './components/DeployRowList.vue';
export { default as DeployRow } from './components/DeployRow.vue';
export { default as SelectionBar } from './components/SelectionBar.vue';
export { default as RegexBuilderPopover } from './components/RegexBuilderPopover.vue';
export { default as CommandPalette } from './components/CommandPalette.vue';
export { default as ConfirmDialog } from './components/ConfirmDialog.vue';
export { default as NotificationHost } from './components/NotificationHost.vue';
export { default as DpIcon } from './components/DpIcon.vue';

export * from './data';

/** Mount the production surface from a Rails element carrying live endpoint metadata. */
export function mountDeploy(selector = '#js-material-deploy') {
  const el = resolveSurfaceElement(selector, '#js-material-deploy');
  if (!el) return null;
  const payload = parseSurfacePayload(el);
  const initial = payload && typeof payload === 'object' ? payload : {};
  return new Vue({
    el,
    name: 'MaterialDeployRoot',
    render: (h) => h(Deploy, {
      props: {
        endpoints: readSurfaceConfig(el),
        initialReleases: initial.releases,
        initialFlags: initial.flags,
        initialPackages: initial.packages,
        initialImages: initial.containers,
      },
    }),
  });
}
