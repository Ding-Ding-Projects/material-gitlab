<template>
  <div class="secure-surface" :class="{ 'secure-surface--dark': isDark }">
    <slot name="sidebar" />
    <div class="secure-surface__main">
      <secure-top-bar
        :search="search"
        :tab-label="activeTab.label"
        :regex-mode="regexMode"
        :regex-builder-open="regexBuilderOpen"
        :regex-initial="regexMode ? search : ''"
        :regex-corpus="regexCorpus"
        :is-dark="isDark"
        @update:search="setSearch"
        @toggle-regex-mode="toggleRegexMode"
        @open-regex-builder="openRegexBuilder"
        @close-regex-builder="closeRegexBuilder"
        @apply-regex="applyRegexPattern"
        @open-palette="openPalette"
        @toggle-theme="toggleTheme"
      />
      <secure-page-header
        :tabs="tabs"
        :active-tab-id="activeTabId"
        :security-dashboard-path="securityDashboardPath"
        @select-tab="selectTab"
        @navigate-security-dashboard="$emit('navigate-security-dashboard')"
      />
      <main class="secure-main">
        <secure-list-panel
          :active-tab-id="activeTabId"
          :tab-label="activeTab.label"
          :rows="currentRows"
          :selected-ids="selectedIds"
          :bulk-actions="currentBulkActions"
          :loading="currentLoading"
          :error="currentError"
          :search-active="Boolean(search)"
          @toggle-select="toggleRowSelected"
          @toggle-select-all="toggleSelectAll"
          @invert-selection="invertSelection"
          @clear-selection="clearSelection"
          @bulk-action="runBulkAction"
          @row-action="onRowAction"
          @retry="retryCurrentTab"
          @clear-search="setSearch('')"
        />
      </main>
    </div>
    <secure-command-palette v-if="paletteOpen" :actions="paletteActions" @close="closePalette" />
    <secure-confirm-dialog
      v-if="pendingConfirm"
      :title="pendingConfirm.title"
      :description="pendingConfirm.description"
      :confirm-label="pendingConfirm.confirmLabel"
      @confirm="confirmPending"
      @cancel="cancelPending"
    />
    <secure-toast-stack />
  </div>
</template>

<script>
import SecureTopBar from './components/SecureTopBar.vue';
import SecurePageHeader from './components/SecurePageHeader.vue';
import SecureListPanel from './components/SecureListPanel.vue';
import SecureCommandPalette from './components/SecureCommandPalette.vue';
import SecureConfirmDialog from './components/SecureConfirmDialog.vue';
import SecureToastStack from './components/SecureToastStack.vue';
import { notificationCenter } from '../../notifications';
import { loadSettings, updateSettings, subscribeSettings } from '../../settings';
import {
  SECURE_TABS,
  SECURE_TAB_IDS,
  fetchDependencies,
  fetchAuditEvents,
  fetchScanPolicies,
  fetchOnDemandScans,
  updateScanPolicyEnforcement,
  updateScanStatus,
  createIssuesForDependencies,
  toDependencyRow,
  toAuditRow,
  toScanPolicyRow,
  toOnDemandScanRow,
  createTextMatcher,
  rowsToCsv,
} from './data';

const ROW_MAPPERS = {
  [SECURE_TAB_IDS.DEPENDENCIES]: toDependencyRow,
  [SECURE_TAB_IDS.AUDIT_EVENTS]: toAuditRow,
  [SECURE_TAB_IDS.SCAN_POLICIES]: toScanPolicyRow,
  [SECURE_TAB_IDS.ON_DEMAND_SCANS]: toOnDemandScanRow,
};

const BULK_ACTION_DEFINITIONS = {
  [SECURE_TAB_IDS.DEPENDENCIES]: [
    { id: 'export', label: 'Export selected', destructive: false },
    { id: 'create-issue', label: 'Create issue for selected', destructive: false },
  ],
  [SECURE_TAB_IDS.AUDIT_EVENTS]: [{ id: 'export', label: 'Export selected', destructive: false }],
  [SECURE_TAB_IDS.SCAN_POLICIES]: [
    { id: 'enable', label: 'Enable selected', destructive: false },
    { id: 'disable', label: 'Disable selected', destructive: true },
  ],
  [SECURE_TAB_IDS.ON_DEMAND_SCANS]: [
    { id: 'run', label: 'Run selected', destructive: false },
    { id: 'cancel', label: 'Cancel selected', destructive: true },
  ],
};

function downloadCsv(filename, content) {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export default {
  name: 'SecureSurface',
  components: {
    SecureTopBar,
    SecurePageHeader,
    SecureListPanel,
    SecureCommandPalette,
    SecureConfirmDialog,
    SecureToastStack,
  },
  props: {
    // Real route to the Security dashboard surface. Left null when the host
    // app has not wired routing yet; see SecurePageHeader for the fallback.
    securityDashboardPath: { type: String, default: null },
  },
  data() {
    return {
      tabs: SECURE_TABS,
      activeTabId: SECURE_TAB_IDS.DEPENDENCIES,
      search: '',
      regexMode: false,
      regexBuilderOpen: false,
      paletteOpen: false,
      isDark: false,
      dependencies: [],
      auditEvents: [],
      scanPolicies: [],
      onDemandScans: [],
      loading: {
        [SECURE_TAB_IDS.DEPENDENCIES]: true,
        [SECURE_TAB_IDS.AUDIT_EVENTS]: true,
        [SECURE_TAB_IDS.SCAN_POLICIES]: true,
        [SECURE_TAB_IDS.ON_DEMAND_SCANS]: true,
      },
      error: {
        [SECURE_TAB_IDS.DEPENDENCIES]: null,
        [SECURE_TAB_IDS.AUDIT_EVENTS]: null,
        [SECURE_TAB_IDS.SCAN_POLICIES]: null,
        [SECURE_TAB_IDS.ON_DEMAND_SCANS]: null,
      },
      selection: {
        [SECURE_TAB_IDS.DEPENDENCIES]: [],
        [SECURE_TAB_IDS.AUDIT_EVENTS]: [],
        [SECURE_TAB_IDS.SCAN_POLICIES]: [],
        [SECURE_TAB_IDS.ON_DEMAND_SCANS]: [],
      },
      pendingConfirm: null,
      lastFocusedElement: null,
    };
  },
  computed: {
    activeTab() {
      return this.tabs.find((tab) => tab.id === this.activeTabId) || this.tabs[0];
    },
    matcher() {
      return createTextMatcher(this.search, this.regexMode);
    },
    currentRawList() {
      return {
        [SECURE_TAB_IDS.DEPENDENCIES]: this.dependencies,
        [SECURE_TAB_IDS.AUDIT_EVENTS]: this.auditEvents,
        [SECURE_TAB_IDS.SCAN_POLICIES]: this.scanPolicies,
        [SECURE_TAB_IDS.ON_DEMAND_SCANS]: this.onDemandScans,
      }[this.activeTabId];
    },
    currentRows() {
      const mapper = ROW_MAPPERS[this.activeTabId];
      return this.currentRawList.map(mapper).filter((row) => this.matcher.test(row.searchText));
    },
    currentLoading() {
      return this.loading[this.activeTabId];
    },
    currentError() {
      return this.error[this.activeTabId];
    },
    currentBulkActions() {
      return BULK_ACTION_DEFINITIONS[this.activeTabId] || [];
    },
    selectedIds() {
      return this.selection[this.activeTabId];
    },
    regexCorpus() {
      return [
        ...this.dependencies.map((item) => item.name),
        ...this.auditEvents.map((item) => item.name),
        ...this.scanPolicies.map((item) => item.name),
        ...this.onDemandScans.map((item) => item.name),
      ];
    },
    paletteActions() {
      return [
        {
          id: 'toggle-theme',
          label: this.isDark ? 'Switch to light theme' : 'Switch to dark theme',
          icon: this.isDark ? 'sun' : 'moon',
          run: () => this.toggleTheme(),
        },
        ...this.tabs.map((tab) => ({
          id: `tab-${tab.id}`,
          label: `Secure: ${tab.label}`,
          icon: 'shield',
          run: () => this.selectTab(tab.id),
        })),
      ];
    },
  },
  created() {
    this.loadAllTabs();
    this.initializeTheme();
  },
  mounted() {
    this.onKeydown = (event) => {
      if ((event.ctrlKey || event.metaKey) && event.shiftKey && (event.key === 'F' || event.key === 'f')) {
        event.preventDefault();
        this.openPalette();
      } else if (event.key === 'Escape') {
        if (this.paletteOpen) this.closePalette();
        else if (this.regexBuilderOpen) this.closeRegexBuilder();
        else if (this.pendingConfirm) this.cancelPending();
      }
    };
    window.addEventListener('keydown', this.onKeydown);
  },
  beforeDestroy() {
    window.removeEventListener('keydown', this.onKeydown);
    if (this.unsubscribeSettings) this.unsubscribeSettings();
  },
  methods: {
    loadAllTabs() {
      this.loadTab(SECURE_TAB_IDS.DEPENDENCIES, fetchDependencies, 'dependencies');
      this.loadTab(SECURE_TAB_IDS.AUDIT_EVENTS, fetchAuditEvents, 'auditEvents');
      this.loadTab(SECURE_TAB_IDS.SCAN_POLICIES, fetchScanPolicies, 'scanPolicies');
      this.loadTab(SECURE_TAB_IDS.ON_DEMAND_SCANS, fetchOnDemandScans, 'onDemandScans');
    },
    loadTab(tabId, fetchFn, dataKey) {
      this.$set(this.loading, tabId, true);
      this.$set(this.error, tabId, null);
      fetchFn()
        .then((result) => {
          this[dataKey] = result;
          this.$set(this.loading, tabId, false);
        })
        .catch(() => {
          this.$set(this.loading, tabId, false);
          this.$set(this.error, tabId, 'Something went wrong loading this data.');
        });
    },
    retryCurrentTab() {
      const loaders = {
        [SECURE_TAB_IDS.DEPENDENCIES]: [fetchDependencies, 'dependencies'],
        [SECURE_TAB_IDS.AUDIT_EVENTS]: [fetchAuditEvents, 'auditEvents'],
        [SECURE_TAB_IDS.SCAN_POLICIES]: [fetchScanPolicies, 'scanPolicies'],
        [SECURE_TAB_IDS.ON_DEMAND_SCANS]: [fetchOnDemandScans, 'onDemandScans'],
      }[this.activeTabId];
      this.loadTab(this.activeTabId, loaders[0], loaders[1]);
    },
    initializeTheme() {
      const settings = loadSettings();
      this.applyThemeSetting(settings.theme);
      this.unsubscribeSettings = subscribeSettings((next) => this.applyThemeSetting(next.theme));
    },
    applyThemeSetting(theme) {
      if (theme === 'dark') this.isDark = true;
      else if (theme === 'light') this.isDark = false;
      else this.isDark = Boolean(window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches);
    },
    toggleTheme() {
      const next = this.isDark ? 'light' : 'dark';
      this.isDark = !this.isDark;
      updateSettings({ theme: next });
    },
    setSearch(value) {
      this.search = value;
    },
    toggleRegexMode() {
      this.regexMode = !this.regexMode;
    },
    openRegexBuilder() {
      this.regexBuilderOpen = true;
    },
    closeRegexBuilder() {
      this.regexBuilderOpen = false;
    },
    applyRegexPattern(pattern) {
      this.search = pattern;
      this.regexMode = true;
      this.regexBuilderOpen = false;
    },
    openPalette() {
      this.lastFocusedElement = document.activeElement;
      this.paletteOpen = true;
    },
    closePalette() {
      this.paletteOpen = false;
      this.restoreFocus();
    },
    selectTab(tabId) {
      this.activeTabId = tabId;
    },
    toggleRowSelected(rowId) {
      const current = this.selection[this.activeTabId];
      const next = current.includes(rowId) ? current.filter((id) => id !== rowId) : [...current, rowId];
      this.$set(this.selection, this.activeTabId, next);
    },
    toggleSelectAll() {
      const shownIds = this.currentRows.map((row) => row.id);
      const current = this.selection[this.activeTabId];
      const allShownSelected = shownIds.length > 0 && shownIds.every((id) => current.includes(id));
      const next = allShownSelected
        ? current.filter((id) => !shownIds.includes(id))
        : Array.from(new Set([...current, ...shownIds]));
      this.$set(this.selection, this.activeTabId, next);
    },
    invertSelection() {
      const shownIds = this.currentRows.map((row) => row.id);
      const current = this.selection[this.activeTabId];
      const hiddenSelected = current.filter((id) => !shownIds.includes(id));
      const invertedShown = shownIds.filter((id) => !current.includes(id));
      this.$set(this.selection, this.activeTabId, [...invertedShown, ...hiddenSelected]);
    },
    clearSelection() {
      this.$set(this.selection, this.activeTabId, []);
    },
    requestDestructive(options) {
      this.lastFocusedElement = document.activeElement;
      this.pendingConfirm = options;
    },
    confirmPending() {
      const action = this.pendingConfirm;
      this.pendingConfirm = null;
      if (action && typeof action.onConfirm === 'function') action.onConfirm();
      this.restoreFocus();
    },
    cancelPending() {
      this.pendingConfirm = null;
      this.restoreFocus();
    },
    restoreFocus() {
      const target = this.lastFocusedElement;
      this.lastFocusedElement = null;
      this.$nextTick(() => {
        if (target && typeof target.focus === 'function') target.focus();
      });
    },
    notify(options) {
      notificationCenter.notify(options);
    },
    onRowAction(row) {
      if (this.activeTabId === SECURE_TAB_IDS.SCAN_POLICIES) {
        const policy = this.scanPolicies.find((item) => item.id === row.id);
        if (!policy) return;
        if (policy.enforced) {
          this.requestDestructive({
            title: 'Disable this scan policy?',
            description: `"${policy.name}" will stop being enforced on merge requests until it is re-enabled.`,
            confirmLabel: 'Disable',
            onConfirm: () => this.bulkSetPolicyEnforced([policy.id], false),
          });
        } else {
          this.bulkSetPolicyEnforced([policy.id], true);
        }
      } else if (this.activeTabId === SECURE_TAB_IDS.ON_DEMAND_SCANS) {
        const scan = this.onDemandScans.find((item) => item.id === row.id);
        if (!scan) return;
        if (scan.status === 'running') {
          this.requestDestructive({
            title: 'Cancel this scan?',
            description: `"${scan.name}" is still running. Cancelling discards progress made so far.`,
            confirmLabel: 'Cancel scan',
            onConfirm: () => this.bulkSetScanStatus([scan.id], 'ready'),
          });
        } else {
          this.bulkSetScanStatus([scan.id], 'running');
        }
      }
    },
    // Bulk-action entry points own clearing the selection once their action
    // completes. The mutation helpers below are reused by per-row actions
    // too (see onRowAction), which must NOT clear an unrelated multi-select.
    runBulkAction(actionId) {
      const ids = [...this.selectedIds];
      if (ids.length === 0) return undefined;
      if (actionId === 'export') {
        this.exportSelected(ids);
        this.clearSelection();
        return undefined;
      }
      if (actionId === 'create-issue') {
        return this.createIssuesFor(ids).then(() => this.clearSelection());
      }
      if (actionId === 'enable') {
        return this.bulkSetPolicyEnforced(ids, true).then(() => this.clearSelection());
      }
      if (actionId === 'disable') {
        return this.requestDestructive({
          title: `Disable ${ids.length} scan ${ids.length === 1 ? 'policy' : 'policies'}?`,
          description: 'Merge requests will no longer be blocked by the selected policies until they are re-enabled.',
          confirmLabel: 'Disable',
          onConfirm: () => this.bulkSetPolicyEnforced(ids, false).then(() => this.clearSelection()),
        });
      }
      if (actionId === 'run') {
        return this.bulkSetScanStatus(ids, 'running').then(() => this.clearSelection());
      }
      if (actionId === 'cancel') {
        return this.requestDestructive({
          title: `Cancel ${ids.length} running ${ids.length === 1 ? 'scan' : 'scans'}?`,
          description: 'Progress made so far on the selected scans will be discarded.',
          confirmLabel: 'Cancel scans',
          onConfirm: () => this.bulkSetScanStatus(ids, 'ready').then(() => this.clearSelection()),
        });
      }
      return undefined;
    },
    exportSelected(ids) {
      const rows = this.currentRows.filter((row) => ids.includes(row.id));
      downloadCsv(`secure-${this.activeTabId}.csv`, rowsToCsv(rows));
      this.notify({
        severity: 'success',
        title: 'Export ready',
        message: `Downloaded ${rows.length} ${this.activeTab.label.toLowerCase()} as CSV.`,
      });
    },
    createIssuesFor(ids) {
      return createIssuesForDependencies(ids).then((result) => {
        this.notify({ severity: 'success', title: 'Issues created', message: `Drafted ${result.created} tracking issues.` });
      });
    },
    bulkSetPolicyEnforced(ids, enforced) {
      return Promise.all(ids.map((id) => updateScanPolicyEnforcement(id, enforced))).then(() => {
        this.scanPolicies = this.scanPolicies.map((policy) =>
          ids.includes(policy.id) ? { ...policy, enforced } : policy,
        );
        this.notify({
          severity: enforced ? 'success' : 'warning',
          title: enforced ? 'Policy enforced' : 'Policy disabled',
          message: `${ids.length} ${ids.length === 1 ? 'policy' : 'policies'} updated.`,
        });
      });
    },
    bulkSetScanStatus(ids, status) {
      return Promise.all(ids.map((id) => updateScanStatus(id, status))).then(() => {
        this.onDemandScans = this.onDemandScans.map((scan) => (ids.includes(scan.id) ? { ...scan, status } : scan));
        this.notify({
          severity: status === 'running' ? 'info' : 'warning',
          title: status === 'running' ? 'Scan started' : 'Scan cancelled',
          message: `${ids.length} ${ids.length === 1 ? 'scan' : 'scans'} updated.`,
        });
      });
    },
  },
};
</script>
