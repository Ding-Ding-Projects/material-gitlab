/**
 * Deploy surface entry point. Ported from design/Deploy.dc.html.
 * Covers Releases, Feature flags, Package registry, and Container registry.
 */

import Deploy from './Deploy.vue';

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
