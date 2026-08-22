import Vue from 'vue';
import Analyze, { createAnalyzeDataAdapter } from './surfaces/Analyze';
import CommandPalette from './surfaces/CommandPalette';
import ShellB from './surfaces/ShellB';
import Sidebar from './surfaces/Sidebar';

const parseJson = (value, fallback) => {
  if (!value) return fallback;
  try { return JSON.parse(value); } catch (_error) { return fallback; }
};

const toSections = (payload) => {
  const source = payload?.current_menu_items || payload?.menu_items || payload?.items || [];
  const sections = [];
  const walk = (items, name = 'Navigation') => {
    const rows = (items || []).map((item) => ({
      id: item.id,
      label: item.title || item.text || item.label,
      href: item.link || item.href || '#',
      icon: item.icon,
      count: item.count ?? item.pill_count,
      active: Boolean(item.is_active || item.active),
    })).filter((item) => item.label);
    if (rows.length) sections.push({ name, items: rows });
    (items || []).forEach((item) => walk(item.items, item.title || item.text || name));
  };
  walk(source);
  return sections;
};

const mount = (el, Component, props = {}) => {
  if (!el || el.__materialMount) return el?.__materialMount || null;
  const vm = new Vue({ name: `${Component.name || 'Material'}Mount`, render: (h) => h(Component, { props }) }).$mount(el);
  el.__materialMount = vm;
  return vm;
};

export function mountSidebar(el = document.querySelector('.m3-shell-sidebar-host'), options = {}) {
  if (!el) return null;
  const payload = options.data || parseJson(el.dataset.sidebar, {});
  return mount(el, Sidebar, { sections: options.sections || toSections(payload), active: options.active || payload.current_context_header || '', project: options.project || payload.current_context?.item || {} });
}

export function mountAuthenticatedShell(el = document.querySelector('.m3-shell-topbar-host'), options = {}) {
  if (!el) return null;
  const payload = options.data || parseJson(document.querySelector('.m3-shell-sidebar-host')?.dataset.sidebar, {});
  return mount(el, ShellB, { chromeOnly: true, brand: options.brand || 'GitLab M3', sections: options.sections || toSections(payload), paletteActions: options.paletteActions || [] });
}

export function mountLoginShell(el = document.querySelector('.login-m3-surface'), options = {}) {
  if (!el || el.__materialLoginShell) return el?.__materialLoginShell || null;
  const host = document.createElement('div');
  host.className = 'material-login-shell-host';
  host.dataset.materialShell = 'login';
  el.insertBefore(host, el.firstChild);
  const vm = mount(host, ShellB, { chromeOnly: true, brand: options.brand || 'GitLab M3', paletteActions: options.paletteActions || [] });
  el.__materialLoginShell = vm;
  return vm;
}

export function mountCommandPalette(el = document.querySelector('#material-command-palette-root'), options = {}) {
  if (!el) return null;
  return mount(el, CommandPalette, { actions: options.actions || [] });
}

export function mountAnalyzeSurface(el = document.querySelector('#js-explore-analytics-dashboards'), options = {}) {
  if (!el) return null;
  const payload = options.data || parseJson(el.dataset.analyticsData || el.dataset.dashboardData, null);
  return mount(el, Analyze, { dataAdapter: options.dataAdapter || createAnalyzeDataAdapter(payload), paletteActions: options.paletteActions || [] });
}

export function mountMaterialSurfaces(options = {}) {
  const sidebar = mountSidebar(options.sidebar, options);
  const shell = mountAuthenticatedShell(options.shell, options);
  const login = mountLoginShell(options.login, options);
  const palette = mountCommandPalette(options.palette, options);
  const analyze = mountAnalyzeSurface(options.analyze, options);
  return { sidebar, shell, login, palette, analyze };
}

export default mountMaterialSurfaces;
