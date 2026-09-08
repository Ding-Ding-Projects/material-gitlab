<template>
  <div class="gl-mds-plan" :data-theme="dark ? 'dark' : 'light'">
    <slot name="sidebar" />
    <div class="gl-mds-plan__main">
      <top-bar
        ref="topBar"
        :search="search"
        :regex-mode="regexMode"
        :regex-invalid="regexInvalid"
        :regex-builder-open="regexBuilderOpen"
        :dark="dark"
        :tab-label="activeTab"
        :avatar-initials="avatarInitials"
        @update:search="search = $event"
        @toggle-regex-mode="toggleRegexMode"
        @open-regex-builder="openRegexBuilder"
        @open-palette="openPalette"
        @toggle-theme="toggleTheme"
      >
        <template #regex-popover>
          <regex-builder-popover
            v-if="regexBuilderOpen"
            :initial="regexMode ? search : ''"
            :corpus="regexCorpus"
            corpus-title="Matches"
            @apply="applyRegex"
            @close="closeRegexBuilder"
          />
        </template>
      </top-bar>

      <div class="gl-mds-plan__heading-row">
        <h1 class="gl-mds-plan__heading">Plan</h1>
        <plan-tabs :tabs="tabs" :active="activeTab" @select="selectTab" />
      </div>

      <main class="gl-mds-plan__content">
        <gl-button v-if="activeTab === 'Milestones' && newMilestonePath" :href="newMilestonePath">New milestone</gl-button>
        <gl-button v-if="activeTab === 'Wiki' && wikiPath" :href="wikiPath">Open wiki editor and page history</gl-button>
        <p v-if="production && activeTab === 'Iterations'">Iteration scheduling is managed in the parent group's iteration editor. This view supports reading and export.</p>
        <div v-if="loading" class="gl-mds-plan__loading" role="status">Loading…</div>
        <div v-else-if="loadError" class="gl-mds-plan__error" role="alert">
          <strong>Plan data could not be loaded.</strong>
          <span>{{ loadError.message }}</span>
          <button type="button" @click="loadAll">Retry</button>
        </div>
        <template v-else>
          <div v-if="activeResourceError" class="gl-mds-plan__error" role="alert">
            <strong>{{ activeTab }} are unavailable.</strong>
            <span>{{ activeResourceError.message }}</span>
            <button type="button" @click="loadResource(activeTab)">Retry</button>
          </div>
          <wiki-panel
            v-else-if="activeTab === 'Wiki'"
            :filtered-pages="filteredWikiPages"
            :active-page="activePage"
            :editing="wikiEditing"
            :can-edit="!production || permissions.wiki === true"
            :saving="wikiSaving"
            @select="selectWikiPage"
            @toggle-edit="toggleWikiEdit"
            @update-body="updateWikiBody"
          />
          <record-list
            v-else
            :rows="currentRows"
            :selected-ids="selection[activeTab]"
            :tab-label="activeTab"
            :bulk-actions="bulkActions"
            @toggle-select="toggleSelect"
            @select-all="selectAll"
            @clear-selection="clearSelection"
            @invert-selection="invertSelection"
            @bulk-action="onBulkAction"
          />
        </template>
      </main>
    </div>

    <command-palette-overlay v-if="paletteOpen" :actions="paletteActions" @close="closePalette" />
    <confirm-dialog
      v-if="confirmState"
      :title="confirmState.title"
      :message="confirmState.message"
      :confirm-label="confirmState.confirmLabel"
      @confirm="confirmDialogConfirm"
      @cancel="confirmDialogCancel"
    />
    <notification-stack />
  </div>
</template>

<script>
import { GlButton } from '@gitlab/ui';
import { loadSettings, updateSettings, subscribeSettings } from '../../settings';
import notificationCenter from '../../notifications';
import TopBar from './components/TopBar.vue';
import PlanTabs from './components/PlanTabs.vue';
import RecordList from './components/RecordList.vue';
import WikiPanel from './components/WikiPanel.vue';
import RegexBuilderPopover from './components/RegexBuilderPopover.vue';
import CommandPaletteOverlay from './components/CommandPaletteOverlay.vue';
import ConfirmDialog from './components/ConfirmDialog.vue';
import NotificationStack from './components/NotificationStack.vue';
import {
  PLAN_TABS,
  TAB_ICON,
  buildRow,
  createMatcher,
  withField,
  withoutIds,
  rowsToCsv,
  updateWikiBody as applyWikiBody,
  fetchMilestones as defaultFetchMilestones,
  fetchIterations as defaultFetchIterations,
  fetchRequirements as defaultFetchRequirements,
  fetchWikiPages as defaultFetchWikiPages,
  mutatePlanEntity as defaultMutatePlanEntity,
  deletePlanEntity as defaultDeletePlanEntity,
  saveWikiPage as defaultSaveWikiPage,
} from './data';

const ENTITY_FIELD_BY_TAB = { Milestones: 'state', Iterations: 'state', Requirements: 'status' };
const BULK_VALUE_BY_ACTION = { close: 'closed', reopen: 'active', satisfied: 'satisfied', failed: 'failed' };

export default {
  name: 'Plan',
  components: {
    GlButton,
    TopBar,
    PlanTabs,
    RecordList,
    WikiPanel,
    RegexBuilderPopover,
    CommandPaletteOverlay,
    ConfirmDialog,
    NotificationStack,
  },
  props: {
    fetchMilestones: { type: Function, default: defaultFetchMilestones },
    fetchIterations: { type: Function, default: defaultFetchIterations },
    fetchRequirements: { type: Function, default: defaultFetchRequirements },
    fetchWikiPages: { type: Function, default: defaultFetchWikiPages },
    mutateEntity: { type: Function, default: defaultMutatePlanEntity },
    deleteEntity: { type: Function, default: defaultDeletePlanEntity },
    saveWiki: { type: Function, default: defaultSaveWikiPage },
    avatarInitials: { type: String, default: '' },
    production: { type: Boolean, default: false },
    permissions: { type: Object, default: () => ({}) },
    newMilestonePath: { type: String, default: '' },
    wikiPath: { type: String, default: '' },
  },
  data() {
    return {
      loading: true,
      themeSetting: 'system',
      search: '',
      regexMode: false,
      regexBuilderOpen: false,
      paletteOpen: false,
      activeTab: PLAN_TABS[0],
      milestones: [],
      iterations: [],
      requirements: [],
      wikiPages: [],
      activeWikiPageId: '',
      wikiEditing: false,
      wikiSaving: false,
      selection: { Milestones: [], Iterations: [], Requirements: [] },
      confirmState: null,
      loadError: null,
      resourceErrors: {},
    };
  },
  computed: {
    tabs() {
      return PLAN_TABS;
    },
    dark() {
      if (this.themeSetting === 'dark') return true;
      if (this.themeSetting === 'light') return false;
      return typeof window !== 'undefined' && !!window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    },
    matcher() {
      return createMatcher(this.search, this.regexMode);
    },
    regexInvalid() {
      return this.matcher.error;
    },
    currentRows() {
      if (this.activeTab === 'Wiki') return [];
      const entities = { Milestones: this.milestones, Iterations: this.iterations, Requirements: this.requirements }[this.activeTab];
      const icon = TAB_ICON[this.activeTab];
      return entities.filter((entity) => this.matcher.test(entity.name)).map((entity) => buildRow(entity, icon));
    },
    filteredWikiPages() {
      return this.wikiPages.filter((page) => this.matcher.test(page.title));
    },
    activePage() {
      return this.wikiPages.find((page) => page.id === this.activeWikiPageId) || this.wikiPages[0] || { id: '', title: '', body: '', meta: '' };
    },
    regexCorpus() {
      return [
        ...this.milestones.map((entity) => entity.name),
        ...this.iterations.map((entity) => entity.name),
        ...this.requirements.map((entity) => entity.name),
        ...this.wikiPages.map((page) => page.title),
      ];
    },
    paletteActions() {
      const actions = [{ label: 'Toggle dark theme', icon: this.dark ? 'light-mode' : 'dark-mode', kind: 'Action', run: this.toggleTheme }];
      this.tabs.forEach((tab) => {
        actions.push({ label: `Plan: ${tab}`, icon: TAB_ICON[tab] || 'menu-book', kind: 'Section', run: () => this.selectTab(tab) });
      });
      return actions;
    },
    activeResourceError() {
      return this.resourceErrors[this.activeTab] || null;
    },
    bulkActions() {
      if (this.production && (this.activeTab !== 'Milestones' || this.permissions.milestones !== true)) {
        return [{ id: 'export', label: 'Export CSV', icon: 'download' }];
      }
      if (this.activeTab === 'Milestones' || this.activeTab === 'Iterations') {
        return [
          { id: 'close', label: 'Close', icon: 'check' },
          { id: 'reopen', label: 'Reopen', icon: 'update' },
          { id: 'export', label: 'Export CSV', icon: 'download' },
        ];
      }
      if (this.activeTab === 'Requirements') {
        return [
          { id: 'satisfied', label: 'Mark satisfied', icon: 'check' },
          { id: 'failed', label: 'Mark failed', icon: 'warning' },
          { id: 'export', label: 'Export CSV', icon: 'download' },
          { id: 'delete', label: 'Delete', icon: 'delete', danger: true },
        ];
      }
      return [];
    },
  },
  created() {
    const settings = loadSettings();
    this.themeSetting = settings.theme;
    this.unsubscribeSettings = subscribeSettings((next) => {
      this.themeSetting = next.theme;
    });
    this.loadAll();
  },
  mounted() {
    this.onKeydown = (event) => {
      if (event.ctrlKey && event.shiftKey && (event.key === 'F' || event.key === 'f')) {
        event.preventDefault();
        this.paletteOpen = true;
      }
      if (event.key === 'Escape') {
        if (this.paletteOpen) this.paletteOpen = false;
        else if (this.regexBuilderOpen) this.regexBuilderOpen = false;
      }
    };
    window.addEventListener('keydown', this.onKeydown);
  },
  beforeDestroy() {
    window.removeEventListener('keydown', this.onKeydown);
    if (this.unsubscribeSettings) this.unsubscribeSettings();
  },
  methods: {
    async loadAll() {
      this.loading = true;
      this.loadError = null;
      const results = await Promise.allSettled([
        this.fetchMilestones(), this.fetchIterations(), this.fetchRequirements(), this.fetchWikiPages(),
      ]);
      const tabs = ['Milestones', 'Iterations', 'Requirements', 'Wiki'];
      const fields = ['milestones', 'iterations', 'requirements', 'wikiPages'];
      const errors = {};
      results.forEach((result, index) => {
        if (result.status === 'fulfilled') this[fields[index]] = result.value;
        else errors[tabs[index]] = result.reason;
      });
      this.resourceErrors = errors;
      if (results.every((result) => result.status === 'rejected')) {
        this.loadError = results[0].reason;
        notificationCenter.notify({
          title: 'Plan unavailable',
          message: this.loadError?.message || 'The server could not load planning records.',
          severity: 'error',
        });
      }
      this.activeWikiPageId = this.wikiPages[0] ? this.wikiPages[0].id : '';
      this.loading = false;
    },
    async loadResource(tab) {
      const loaders = {
        Milestones: ['milestones', this.fetchMilestones],
        Iterations: ['iterations', this.fetchIterations],
        Requirements: ['requirements', this.fetchRequirements],
        Wiki: ['wikiPages', this.fetchWikiPages],
      };
      const [field, loader] = loaders[tab];
      try {
        this[field] = await loader();
        this.resourceErrors = { ...this.resourceErrors, [tab]: undefined };
        if (tab === 'Wiki') this.activeWikiPageId = this.wikiPages[0] ? this.wikiPages[0].id : '';
      } catch (error) {
        this.resourceErrors = { ...this.resourceErrors, [tab]: error };
      }
    },
    selectTab(tab) {
      this.activeTab = tab;
      this.regexBuilderOpen = false;
    },
    toggleRegexMode() {
      this.regexMode = !this.regexMode;
    },
    openRegexBuilder() {
      this.regexBuilderOpen = true;
    },
    closeRegexBuilder() {
      this.regexBuilderOpen = false;
      // The popover was anchored to the search field; hand focus back to it.
      this.$nextTick(() => this.$refs.topBar?.focusSearch());
    },
    applyRegex(pattern) {
      this.search = pattern;
      this.regexMode = true;
      this.regexBuilderOpen = false;
      this.$nextTick(() => this.$refs.topBar?.focusSearch());
    },
    openPalette() {
      this.paletteOpen = true;
    },
    closePalette() {
      this.paletteOpen = false;
    },
    toggleTheme() {
      const nextTheme = this.dark ? 'light' : 'dark';
      const result = updateSettings({ theme: nextTheme });
      if (result.ok) this.themeSetting = result.value.theme;
    },
    selectWikiPage(id) {
      if (this.wikiSaving) return;
      this.activeWikiPageId = id;
      this.wikiEditing = false;
    },
    async toggleWikiEdit() {
      if (this.wikiSaving || !this.activePage.id || (this.production && this.permissions.wiki !== true)) return;
      if (this.wikiEditing) {
        const { id, title, body } = this.activePage;
        this.wikiSaving = true;
        try {
          const saved = await this.saveWiki({ id, body });
          if (saved) this.wikiPages = this.wikiPages.map((page) => page.id === id ? saved : page);
          this.wikiEditing = false;
          notificationCenter.notify({ title: 'Wiki page saved', message: `"${title}" was updated.`, severity: 'success' });
        } catch (error) {
          notificationCenter.notify({ title: 'Wiki page not saved', message: error.message, severity: 'error' });
        } finally { this.wikiSaving = false; }
      } else this.wikiEditing = true;
    },
    updateWikiBody(body) {
      this.wikiPages = applyWikiBody(this.wikiPages, this.activeWikiPageId, body);
    },
    toggleSelect(id) {
      const tab = this.activeTab;
      const current = this.selection[tab];
      const next = current.includes(id) ? current.filter((existing) => existing !== id) : [...current, id];
      this.selection = { ...this.selection, [tab]: next };
    },
    selectAll() {
      this.selection = { ...this.selection, [this.activeTab]: this.currentRows.map((row) => row.id) };
    },
    clearSelection() {
      this.selection = { ...this.selection, [this.activeTab]: [] };
    },
    invertSelection() {
      const tab = this.activeTab;
      const current = new Set(this.selection[tab]);
      const next = this.currentRows.map((row) => row.id).filter((id) => !current.has(id));
      this.selection = { ...this.selection, [tab]: next };
    },
    onBulkAction(actionId) {
      const tab = this.activeTab;
      const ids = this.selection[tab];
      if (!ids || ids.length === 0) return;
      if (actionId === 'export') {
        const rows = this.currentRows.filter((row) => ids.includes(row.id));
        this.downloadCsv(`${tab.toLowerCase()}.csv`, rowsToCsv(rows));
        notificationCenter.notify({ title: 'Export ready', message: `${rows.length} ${tab.toLowerCase()} exported to CSV.`, severity: 'success' });
        return;
      }
      if (actionId === 'delete' && tab === 'Requirements') {
        this.requestDeleteRequirements(ids);
        return;
      }
      const field = ENTITY_FIELD_BY_TAB[tab];
      const value = BULK_VALUE_BY_ACTION[actionId];
      if (!field || !value) return;
      const listKey = tab.toLowerCase();
      Promise.all(ids.map((id) => this.mutateEntity({ resource: tab.toLowerCase(), id, changes: { [field]: value } })))
        .then(() => {
          this[listKey] = withField(this[listKey], ids, field, value);
          notificationCenter.notify({ title: `${tab} updated`, message: `${ids.length} ${tab.toLowerCase()} marked ${value}.`, severity: 'success' });
          this.selection = { ...this.selection, [tab]: [] };
        })
        .catch(async (error) => {
          await this.loadResource(tab);
          notificationCenter.notify({ title: `${tab} was not updated`, message: error.message, severity: 'error' });
        });
    },
    requestDeleteRequirements(ids) {
      this.confirmState = {
        title: 'Delete requirements',
        message: `This permanently removes ${ids.length} requirement${ids.length === 1 ? '' : 's'} from this project. This cannot be undone.`,
        confirmLabel: 'Delete',
        onConfirm: () => {
          Promise.all(ids.map((id) => this.deleteEntity({ resource: 'requirements', id })))
            .then(() => {
              this.requirements = withoutIds(this.requirements, ids);
              this.selection = { ...this.selection, Requirements: [] };
              notificationCenter.notify({
                title: 'Requirements deleted',
                message: `${ids.length} requirement${ids.length === 1 ? '' : 's'} removed.`,
                severity: 'success',
              });
              this.confirmState = null;
            })
            .catch((error) => notificationCenter.notify({ title: 'Requirements were not deleted', message: error.message, severity: 'error' }));
        },
      };
    },
    confirmDialogConfirm() {
      if (this.confirmState) this.confirmState.onConfirm();
    },
    confirmDialogCancel() {
      this.confirmState = null;
    },
    downloadCsv(filename, csv) {
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    },
  },
};
</script>

<style scoped lang="scss">
@import './plan';
</style>
