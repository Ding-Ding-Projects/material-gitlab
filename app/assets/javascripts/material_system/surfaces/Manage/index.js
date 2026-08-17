/**
 * Entry point for the Manage surface (Activity + Labels), ported from Manage.dc.html.
 * Keep this the one stable import path for consumers mounting the surface.
 */

import Manage from './Manage.vue';

export default Manage;
export { default as Manage } from './Manage.vue';

export { default as ManageSidebar } from './components/ManageSidebar.vue';
export { default as ManageTopBar } from './components/ManageTopBar.vue';
export { default as ManagePageHeader } from './components/ManagePageHeader.vue';
export { default as ActivityFeed } from './components/ActivityFeed.vue';
export { default as LabelsList } from './components/LabelsList.vue';
export { default as RegexBuilderPopover } from './components/RegexBuilderPopover.vue';
export { default as CommandPalette } from './components/CommandPalette.vue';
export { default as ConfirmDialog } from './components/ConfirmDialog.vue';
export { default as NotificationHost } from './components/NotificationHost.vue';
export { default as MgSelectionToolbar } from './components/MgSelectionToolbar.vue';
export { default as MgIcon } from './components/MgIcon.vue';

export * from './data';

export function mountManage(el, propsData = {}) {
  // Deferred require so this helper is a no-op import when Vue isn't bundled for the caller.
  // eslint-disable-next-line global-require
  const Vue = require('vue').default || require('vue');
  return new Vue({ render: (h) => h(Manage, { props: propsData }) }).$mount(el);
}
