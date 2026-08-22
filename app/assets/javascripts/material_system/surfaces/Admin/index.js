/**
 * Entry point for the Admin surface, ported from design/Admin.dc.html.
 * Re-exports the Vue component plus the full view-model module so a host
 * app can mount <Admin> directly or drive its own UI from the same data.
 */

export { default as Admin } from './Admin.vue';
export { default } from './Admin.vue';

export * from './data';

import { initVueApp } from '~/lib/utils/vue3compat/init_vue_app';
import Admin from './Admin.vue';

export const ADMIN_MOUNT_SELECTOR = '#js-material-admin';

const parseData = (value, fallback) => {
  try {
    return value ? JSON.parse(value) : fallback;
  } catch (_error) {
    return fallback;
  }
};

export function initAdminMaterial(el = ADMIN_MOUNT_SELECTOR) {
  const target = typeof el === 'string' ? document.querySelector(el) : el;
  if (!target) return null;

  const attrs = target.dataset;
  const actionAdapter = attrs.actionUrl
    ? async ({ tab, actionId, ids }) => {
        const csrf = document.querySelector('meta[name="csrf-token"]')?.content;
        const response = await fetch(attrs.actionUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...(csrf ? { 'X-CSRF-Token': csrf } : {}) },
          credentials: 'same-origin',
          body: JSON.stringify({ tab, action: actionId, ids }),
        });
        const body = await response.json().catch(() => ({}));
        return response.ok ? { ok: true, data: body.data } : { ok: false, error: body.error || 'The action was not completed.' };
      }
    : null;

  return initVueApp({
    el: target,
    name: 'MaterialAdminRoot',
    component: Admin,
    propsData: {
      initialData: parseData(attrs.initialData, {}),
      statCards: parseData(attrs.statCards, []),
      instanceHealth: parseData(attrs.instanceHealth, []),
      permissions: parseData(attrs.permissions, {}),
      title: attrs.title || 'Admin area',
      accountName: attrs.accountName || '',
      accountInitials: attrs.accountInitials || '',
      actionAdapter,
    },
  });
}
