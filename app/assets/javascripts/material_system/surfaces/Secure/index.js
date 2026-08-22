/**
 * Entry point for the Secure surface (dependency list, audit events, scan
 * policies, on-demand scans), ported from design/Secure.dc.html.
 */
import './secure.scss';
import Vue from 'vue';
import { readSurfaceConfig, resolveSurfaceElement } from '../live-data';
import SecureSurface from './Secure.vue';

export { default as SecureSurface } from './Secure.vue';
export * from './data';

export function mountSecureSurface(selector = '#js-material-secure') {
  const el = resolveSurfaceElement(selector, '#js-material-secure');
  if (!el) return null;
  return new Vue({
    el,
    name: 'MaterialSecureRoot',
    render: (h) => h(SecureSurface, {
      props: { endpoints: readSurfaceConfig(el), securityDashboardPath: el.dataset?.securityDashboardPath || null },
    }),
  });
}
