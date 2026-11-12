import Vue from 'vue';
import Analyze, { createAnalyzeDataAdapter } from './surfaces/Analyze';
import CommandPalette from './surfaces/CommandPalette';
import ShellA from './surfaces/ShellA';
import ShellB from './surfaces/ShellB';
import Sidebar from './surfaces/Sidebar';
import TopbarFeatures from './surfaces/FeatureLayer/TopbarFeatures.vue';
import FeatureLayer from './surfaces/FeatureLayer/FeatureLayer.vue';
import { createFeatureState } from './features/state';
import { loadSettings, updateSettings, subscribeSettings } from './settings';
import { __ } from '~/locale';

const parseJson = (value, fallback) => {
  if (!value) return fallback;
  try { return JSON.parse(value); } catch (_error) { return fallback; }
};

export const safeNavigationHref = (href) => {
  if (typeof href !== 'string' || !href.trim() || href === '#') return null;
  try {
    const url = new URL(href, window.location.href);
    return ['http:', 'https:'].includes(url.protocol) && !url.username && !url.password ? url.href : null;
  } catch {
    return null;
  }
};

const toSections = (payload) => {
  const source = payload?.current_menu_items || payload?.menu_items || payload?.items || [];
  const sections = [];
  const walk = (items, name = 'Navigation') => {
    const rows = (items || []).map((item) => ({
      id: item.id,
      label: item.title || item.text || item.label,
      href: safeNavigationHref(item.link || item.href),
      icon: item.icon,
      count: item.count ?? item.pill_count,
      active: Boolean(item.is_active || item.active),
    })).filter((item) => item.label && item.href);
    if (rows.length) sections.push({ name, items: rows });
    (items || []).forEach((item) => walk(item.items, item.title || item.text || name));
  };
  walk(source);
  return sections;
};

const mount = (el, Component, props = {}) => {
  if (!el || el.__materialMount) return el?.__materialMount || null;
  const { listeners = {}, ...componentProps } = props;
  const vm = new Vue({ name: `${Component.name || 'Material'}Mount`, data: () => ({ surfaceProps: componentProps }), render(h) { return h(Component, { props: this.surfaceProps, on: listeners }); } }).$mount(el);
  el.__materialMount = vm;
  return vm;
};

const resolveTheme = (settings) => settings.theme === 'system'
  ? (document.documentElement.classList.contains('gl-dark') || window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
  : settings.theme;

export function mountSidebar(el = document.querySelector('.m3-shell-sidebar-host'), options = {}) {
  if (!el || el.__materialMount) return el?.__materialMount || null;
  const payload = options.data || parseJson(el.dataset.sidebar, {});
  const vm = mount(el, Sidebar, { sections: options.sections || toSections(payload), active: options.active || payload.current_context_header || '', project: options.project || payload.current_context?.item || {}, theme: resolveTheme(loadSettings()), feature: options.feature || null });
  const unsubscribe = subscribeSettings((next) => { vm.surfaceProps.theme = resolveTheme(next); });
  vm.$once('hook:beforeDestroy', unsubscribe);
  // The display name from the feature hub renames the sidebar brand, never the install.
  if (options.feature) vm.$watch(() => options.feature.state.displayName, (name) => { vm.surfaceProps.brand = name; }, { immediate: true });
  return vm;
}

export function mountAuthenticatedShell(el = document.querySelector('.m3-shell-topbar-host'), options = {}) {
  if (!el || el.__materialMount) return el?.__materialMount || null;
  const payload = options.data || parseJson(document.querySelector('.m3-shell-sidebar-host')?.dataset.sidebar, {});
  const sections = options.sections || toSections(payload);
  const navigate = options.navigate || ((href) => window.location.assign(href));
  const paletteActions = options.paletteActions || sections.flatMap((section) => section.items)
    .filter(({ href }) => safeNavigationHref(href))
    .map((item) => ({ id: `navigate-${item.id || item.href}`, label: item.label, run: () => navigate(safeNavigationHref(item.href)) }));
  const navigateSearch = (query) => {
    if (query && query.trim()) {
      const prefix = window.gon?.relative_url_root || '';
      navigate(`${prefix}/search?search=${encodeURIComponent(query.trim())}`);
    }
  };
  const storage = options.storage || globalThis.localStorage;
  const saved = loadSettings(storage);
  let vm;
  const savePreference = (patch) => {
    const result = updateSettings(patch, storage);
    if (!result.ok) { vm.preferenceError = __('The header preference could not be saved.'); return; }
    vm.preferenceError = '';
    vm.variant = result.value.shellVariant;
    vm.currentTheme = resolveTheme(result.value);
    vm.$nextTick(() => vm.$children[0]?.focusSearch());
  };
  vm = new Vue({
    name: 'MaterialAuthenticatedShellMount',
    data: () => ({ variant: saved.shellVariant, currentTheme: resolveTheme(saved), preferenceError: '' }),
    render(h) {
      const actions = [...paletteActions,
        { id: 'header-full', label: __('Show the header theme control'), run: () => savePreference({ shellVariant: 'a' }) },
        { id: 'header-minimal', label: __('Hide the header theme control'), run: () => savePreference({ shellVariant: 'b' }) },
      ];
      return h(this.variant === 'a' ? ShellA : ShellB, {
        scopedSlots: options.feature
          ? { actions: () => h(TopbarFeatures, { props: { feature: options.feature, todosHref: `${window.gon?.relative_url_root || ''}/dashboard/todos` } }) }
          : undefined,
        props: { chromeOnly: true, brand: options.brand || 'GitLab M3', sections, paletteActions: actions, initialTheme: this.currentTheme, managedTheme: true, preferenceError: this.preferenceError },
        on: { search: navigateSearch, 'regex-change': ({ pattern }) => navigateSearch(pattern), 'theme-change': (theme) => savePreference({ theme }) },
      });
    },
  }).$mount(el);
  const unsubscribe = subscribeSettings((next) => { vm.variant = next.shellVariant; vm.currentTheme = resolveTheme(next); });
  vm.$once('hook:beforeDestroy', unsubscribe);
  el.__materialMount = vm;
  return vm;
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

// Page-wide Material features (features rail, feature hub with the setup wizard, dim sum
// surprise). Returns the shared feature state so the top bar controls can use the same one.
export function mountFeatureLayer(options = {}) {
  const feature = options.feature || createFeatureState({ storage: options.storage });
  let el = options.el || document.querySelector('#material-feature-layer');
  if (!el) {
    el = document.createElement('div');
    el.id = 'material-feature-layer';
    document.body.appendChild(el);
  }
  if (el.__materialMount) return { vm: el.__materialMount, feature };
  const vm = mount(el, FeatureLayer, { feature, autoSetup: options.autoSetup !== false });
  return { vm, feature };
}
