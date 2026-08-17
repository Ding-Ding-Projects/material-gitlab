/**
 * Entry point for the Admin surface, ported from design/Admin.dc.html.
 * Re-exports the Vue component plus the full view-model module so a host
 * app can mount <Admin> directly or drive its own UI from the same data.
 */

export { default as Admin } from './Admin.vue';
export { default } from './Admin.vue';

export * from './data';
