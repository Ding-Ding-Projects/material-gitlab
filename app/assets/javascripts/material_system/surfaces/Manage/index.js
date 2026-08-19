/**
 * Entry point for the Manage surface (Activity + Labels), ported from Manage.dc.html.
 * Keep this the one stable import path for consumers mounting the surface.
 */

import Manage from './Manage.vue';
import { initVueApp } from '~/lib/utils/vue3compat/init_vue_app';

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

export const MANAGE_MOUNT_SELECTOR = '#js-material-manage';

const parseData = (value, fallback) => {
  try {
    return value ? JSON.parse(value) : fallback;
  } catch (_error) {
    return fallback;
  }
};

export function initManageMaterial(el = MANAGE_MOUNT_SELECTOR) {
  const target = typeof el === 'string' ? document.querySelector(el) : el;
  if (!target) return null;
  const attrs = target.dataset;
  const csrf = document.querySelector('meta[name="csrf-token"]')?.content;
  const deleteLabel = attrs.deleteLabelUrl
    ? (id) =>
        fetch(`${attrs.deleteLabelUrl.replace(/\/$/, '')}/${encodeURIComponent(id)}`, {
          method: 'DELETE',
          credentials: 'same-origin',
          headers: csrf ? { 'X-CSRF-Token': csrf } : {},
        }).then(async (response) => {
          if (!response.ok) throw new Error((await response.json().catch(() => ({}))).error || 'The label was not deleted.');
          return response;
        })
    : null;

  return initVueApp({
    el: target,
    name: 'MaterialManageRoot',
    component: Manage,
    propsData: {
      initialEvents: parseData(attrs.initialEvents, []),
      initialLabels: parseData(attrs.initialLabels, []),
      routes: parseData(attrs.routes, {}),
      deleteLabel,
    },
  });
}

export function mountManage(el, propsData = {}) {
  // Deferred require so this helper is a no-op import when Vue isn't bundled for the caller.
  // eslint-disable-next-line global-require
  const Vue = require('vue').default || require('vue');
  return new Vue({ render: (h) => h(Manage, { props: propsData }) }).$mount(el);
}
