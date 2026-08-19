<script>
import { loadSettings, subscribeSettings, updateSettings } from '../../settings';
import notificationCenter from '../../notifications';
import TopBar from './components/TopBar.vue';
import SeverityCards from './components/SeverityCards.vue';
import VulnerabilityList from './components/VulnerabilityList.vue';
import BulkActionBar from './components/BulkActionBar.vue';
import TriageDrawer from './components/TriageDrawer.vue';
import CommandPalette from './components/CommandPalette.vue';
import NotificationStack from './components/NotificationStack.vue';
import {
  SEVERITIES,
  CLOSED_STATUSES,
  createSeedVulnerabilities,
  createMatcher,
  buildRegexCorpus,
  severityColorVars,
  severityLabel,
  vulnerabilitySearchText,
} from './data';

/**
 * Security dashboard surface: vulnerability list, severity summary, and
 * triage drawer. Ported from `design/Security.dc.html`. This component
 * renders only the content region to the right of the app shell's sidebar —
 * the sidebar itself is a separate shell surface this lane does not own.
 */
export default {
  name: 'SecurityDashboard',
  components: {
    TopBar,
    SeverityCards,
    VulnerabilityList,
    BulkActionBar,
    TriageDrawer,
    CommandPalette,
    NotificationStack,
  },
  data() {
    const settings = loadSettings();
    return {
      settings,
      prefersDark: this.systemPrefersDark(),
      search: '',
      regexMode: false,
      regexOpen: false,
      paletteOpen: false,
      drawerId: null,
      severityFilter: {},
      selectedMap: {},
      issueCreatedMap: {},
      vulnerabilities: createSeedVulnerabilities(),
    };
  },
  computed: {
    isDark() {
      if (this.settings.theme === 'dark') return true;
      if (this.settings.theme === 'light') return false;
      return this.prefersDark;
    },
    anySeverityActive() {
      return SEVERITIES.some((sv) => this.severityFilter[sv]);
    },
    filteredVulnerabilities() {
      const matches = createMatcher(this.search, this.regexMode);
      return this.vulnerabilities.filter(
        (vuln) =>
          matches(vulnerabilitySearchText(vuln)) && (!this.anySeverityActive || this.severityFilter[vuln.severity]),
      );
    },
    severityCards() {
      return SEVERITIES.map((sv) => {
        const { bg, fg } = severityColorVars(sv);
        const count = this.vulnerabilities.filter(
          (vuln) => vuln.severity === sv && !CLOSED_STATUSES.includes(vuln.status),
        ).length;
        return { key: sv, label: severityLabel(sv), count, bg, fg, active: Boolean(this.severityFilter[sv]) };
      });
    },
    regexCorpus() {
      return buildRegexCorpus(this.vulnerabilities);
    },
    drawerVulnerability() {
      return this.vulnerabilities.find((vuln) => vuln.id === this.drawerId) || null;
    },
    selectedCount() {
      return Object.keys(this.selectedMap).length;
    },
    paletteActions() {
      const severityActions = SEVERITIES.map((sv) => ({
        id: `severity-${sv}`,
        label: `${this.severityFilter[sv] ? 'Clear' : 'Filter to'} ${severityLabel(sv)} severity`,
        icon: 'tune',
        run: () => this.toggleSeverityFilter(sv),
      }));
      const vulnActions = this.filteredVulnerabilities.map((vuln) => ({
        id: `open-${vuln.id}`,
        label: `Open: ${vuln.title}`,
        icon: 'search',
        run: () => this.openVulnerability(vuln.id),
      }));
      return [
        {
          id: 'toggle-theme',
          label: this.isDark ? 'Switch to light theme' : 'Switch to dark theme',
          icon: this.isDark ? 'lightMode' : 'darkMode',
          run: () => this.toggleTheme(),
        },
        {
          id: 'open-regex-builder',
          label: 'Open regex builder',
          icon: 'tune',
          run: () => this.openRegexBuilder(),
        },
        {
          id: 'clear-filters',
          label: 'Clear severity filters',
          icon: 'filterOff',
          run: () => this.clearSeverityFilters(),
        },
        ...severityActions,
        ...vulnActions,
      ];
    },
  },
  watch: {
    filteredVulnerabilities() {
      // Selection only ever describes rows still on screen; prune anything filtered out.
      const nextSelected = {};
      this.filteredVulnerabilities.forEach((vuln) => {
        if (this.selectedMap[vuln.id]) nextSelected[vuln.id] = true;
      });
      this.selectedMap = nextSelected;
    },
  },
  mounted() {
    this.onKeydown = (event) => {
      if (event.ctrlKey && event.shiftKey && (event.key === 'F' || event.key === 'f')) {
        event.preventDefault();
        this.openPalette();
      } else if (event.key === 'Escape') {
        this.paletteOpen = false;
        this.regexOpen = false;
        this.drawerId = null;
      }
    };
    window.addEventListener('keydown', this.onKeydown);

    this.unsubscribeSettings = subscribeSettings((next) => {
      this.settings = next;
    });

    this.mediaQuery = window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null;
    this.onMediaChange = (event) => {
      this.prefersDark = event.matches;
    };
    if (this.mediaQuery) {
      if (this.mediaQuery.addEventListener) this.mediaQuery.addEventListener('change', this.onMediaChange);
      else this.mediaQuery.addListener(this.onMediaChange);
    }
  },
  beforeDestroy() {
    window.removeEventListener('keydown', this.onKeydown);
    if (this.unsubscribeSettings) this.unsubscribeSettings();
    if (this.mediaQuery) {
      if (this.mediaQuery.removeEventListener) this.mediaQuery.removeEventListener('change', this.onMediaChange);
      else this.mediaQuery.removeListener(this.onMediaChange);
    }
  },
  methods: {
    systemPrefersDark() {
      return Boolean(window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches);
    },
    setSearch(value) {
      this.search = value;
    },
    toggleRegexMode() {
      this.regexMode = !this.regexMode;
    },
    openRegexBuilder() {
      this.lastFocused = document.activeElement;
      this.regexOpen = true;
    },
    closeRegexBuilder() {
      this.regexOpen = false;
      this.restoreFocus();
    },
    applyRegex(pattern) {
      this.search = pattern;
      this.regexMode = true;
      this.regexOpen = false;
      this.restoreFocus();
    },
    toggleSeverityFilter(severity) {
      this.$set(this.severityFilter, severity, !this.severityFilter[severity]);
    },
    clearSeverityFilters() {
      this.severityFilter = {};
    },
    openVulnerability(id) {
      this.lastFocused = document.activeElement;
      this.drawerId = id;
    },
    closeDrawer() {
      this.drawerId = null;
      this.restoreFocus();
    },
    setStatus(id, status) {
      const vuln = this.vulnerabilities.find((entry) => entry.id === id);
      if (vuln) vuln.status = status;
    },
    createIssue(id) {
      this.$set(this.issueCreatedMap, id, true);
      notificationCenter.notify({
        title: 'Issue created',
        message: 'Issue #4335 was created from this vulnerability.',
        severity: 'success',
      });
    },
    toggleSelected(id) {
      if (this.selectedMap[id]) this.$delete(this.selectedMap, id);
      else this.$set(this.selectedMap, id, true);
    },
    toggleSelectAllVisible() {
      const allSelected = this.filteredVulnerabilities.every((vuln) => this.selectedMap[vuln.id]);
      const nextSelected = { ...this.selectedMap };
      this.filteredVulnerabilities.forEach((vuln) => {
        if (allSelected) delete nextSelected[vuln.id];
        else nextSelected[vuln.id] = true;
      });
      this.selectedMap = nextSelected;
    },
    invertSelectionVisible() {
      const nextSelected = { ...this.selectedMap };
      this.filteredVulnerabilities.forEach((vuln) => {
        if (nextSelected[vuln.id]) delete nextSelected[vuln.id];
        else nextSelected[vuln.id] = true;
      });
      this.selectedMap = nextSelected;
    },
    clearSelection() {
      this.selectedMap = {};
    },
    bulkSetStatus(status) {
      const ids = Object.keys(this.selectedMap).map(Number);
      ids.forEach((id) => this.setStatus(id, status));
      notificationCenter.notify({
        title: 'Bulk update applied',
        message: `${ids.length} ${ids.length === 1 ? 'vulnerability' : 'vulnerabilities'} set to "${status}".`,
        severity: 'success',
      });
      this.clearSelection();
    },
    bulkExportSelected() {
      const ids = new Set(Object.keys(this.selectedMap).map(Number));
      const rows = this.vulnerabilities.filter((vuln) => ids.has(vuln.id));
      const blob = new Blob([JSON.stringify(rows, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'selected-vulnerabilities.json';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      notificationCenter.notify({
        title: 'Export ready',
        message: `Exported ${rows.length} selected ${rows.length === 1 ? 'vulnerability' : 'vulnerabilities'}.`,
        severity: 'success',
      });
    },
    toggleTheme() {
      const nextTheme = this.isDark ? 'light' : 'dark';
      const result = updateSettings({ theme: nextTheme });
      if (result.ok) this.settings = result.value;
    },
    openPalette() {
      this.lastFocused = document.activeElement;
      this.paletteOpen = true;
    },
    closePalette() {
      this.paletteOpen = false;
      this.restoreFocus();
    },
    restoreFocus() {
      if (this.lastFocused && typeof this.lastFocused.focus === 'function') this.lastFocused.focus();
      this.lastFocused = null;
    },
    issueCreated(id) {
      return Boolean(this.issueCreatedMap[id]);
    },
  },
};
</script>

<template>
  <div class="security-dashboard" :data-theme="isDark ? 'dark' : 'light'">
    <top-bar
      :search="search"
      :regex-mode="regexMode"
      :regex-open="regexOpen"
      :regex-corpus="regexCorpus"
      :dark="isDark"
      @update-search="setSearch"
      @toggle-regex-mode="toggleRegexMode"
      @open-regex-builder="openRegexBuilder"
      @close-regex-builder="closeRegexBuilder"
      @apply-regex="applyRegex"
      @open-palette="openPalette"
      @toggle-theme="toggleTheme"
    />

    <div class="sec-header-row">
      <h1 class="sec-title">Security dashboard</h1>
      <span class="sec-plan-badge">ULTIMATE</span>
    </div>

    <severity-cards :cards="severityCards" @toggle="toggleSeverityFilter" />

    <main class="sec-main">
      <bulk-action-bar
        v-if="selectedCount > 0"
        :selected-count="selectedCount"
        @set-status="bulkSetStatus"
        @export="bulkExportSelected"
        @clear="clearSelection"
      />
      <vulnerability-list
        :vulnerabilities="filteredVulnerabilities"
        :selected-ids="selectedMap"
        @open="openVulnerability"
        @toggle-select="toggleSelected"
        @toggle-select-all="toggleSelectAllVisible"
        @invert-selection="invertSelectionVisible"
      />
    </main>

    <triage-drawer
      v-if="drawerVulnerability"
      :vulnerability="drawerVulnerability"
      :issue-created="issueCreated(drawerVulnerability.id)"
      @close="closeDrawer"
      @set-status="(status) => setStatus(drawerVulnerability.id, status)"
      @create-issue="createIssue(drawerVulnerability.id)"
    />

    <command-palette v-if="paletteOpen" :actions="paletteActions" @close="closePalette" />

    <notification-stack />
  </div>
</template>
