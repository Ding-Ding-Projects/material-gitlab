import Vue from 'vue';
import SecurityDashboard from './Security.vue';
import { readSurfaceConfig, resolveSurfaceElement, parseSurfacePayload } from '../live-data';

import './security.scss';

export { default as SecurityDashboard } from './Security.vue';
export { default as TopBar } from './components/TopBar.vue';
export { default as SeverityCards } from './components/SeverityCards.vue';
export { default as VulnerabilityList } from './components/VulnerabilityList.vue';
export { default as VulnerabilityRow } from './components/VulnerabilityRow.vue';
export { default as SeverityBadge } from './components/SeverityBadge.vue';
export { default as StatusChip } from './components/StatusChip.vue';
export { default as BulkActionBar } from './components/BulkActionBar.vue';
export { default as TriageDrawer } from './components/TriageDrawer.vue';
export { default as RegexBuilderPopover } from './components/RegexBuilderPopover.vue';
export { default as CommandPalette } from './components/CommandPalette.vue';
export { default as NotificationStack } from './components/NotificationStack.vue';
export { default as MaterialIcon } from './components/icons/MaterialIcon.vue';

export * from './data';

/**
 * Mounts the Security dashboard surface onto `#js-security-dashboard` when
 * present. Renders only the content region — drop it inside the app shell
 * that owns the sidebar, per the design's `dc-import name="Sidebar"` block.
 */
export function mountSecurityDashboard(selector = '#js-security-dashboard') {
  const el = resolveSurfaceElement(selector, '#js-security-dashboard');
  if (!el) return null;

  const payload = parseSurfacePayload(el);
  return new Vue({
    el,
    name: 'SecurityDashboardRoot',
    render: (h) => h(SecurityDashboard, {
      props: {
        endpoints: readSurfaceConfig(el),
        initialVulnerabilities: Array.isArray(payload) ? payload : payload?.vulnerabilities || [],
      },
    }),
  });
}

export default mountSecurityDashboard;
