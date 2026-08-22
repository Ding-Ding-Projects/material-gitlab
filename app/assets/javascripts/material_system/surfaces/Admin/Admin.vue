<template>
  <div class="gl-mds-admin" :data-theme="themeAttr" data-screen-label="Admin area">
    <TopBar
      :search="search"
      :search-regex-mode="searchRegexMode"
      :corpus="corpus"
      :dark="dark"
      :notifications="notifications"
      :account-initials="accountInitials"
      :account-name="accountName"
      @update:search="search = $event"
      @update:search-regex-mode="searchRegexMode = $event"
      @open-palette="paletteOpen = true"
      @toggle-theme="toggleTheme"
      @sign-out="signOut"
    />

    <PageHeader :title="title" :tabs="ADMIN_TABS" :active="tab" @select-tab="setTab" />

    <main class="gl-mds-admin__main">
      <OverviewPanel v-if="tab === 'Overview'" :stat-cards="statCards" :health="instanceHealth" />

      <ListPanel
        v-else
        :tab="tab"
        :rows="rows"
        :list-query="listQuery"
        :list-regex-mode="listRegexMode"
        :search-query="search"
        :corpus="tabCorpus"
        :selected-ids="selectedIds"
        :bulk-actions="bulkActions"
        @update:list-query="listQuery = $event"
        @update:list-regex-mode="listRegexMode = $event"
        @toggle-select="toggleSelect"
        @toggle-select-all="toggleSelectAll"
        @invert-selection="invertSelection"
        @bulk-action="(action) => requestAction(action.id, selectedIds)"
        @row-action="({ id, actionId }) => requestAction(actionId, [id])"
        @clear-filters="clearFilters"
      />
    </main>

    <CommandPalette :open="paletteOpen" :actions="paletteActions" @close="paletteOpen = false" />

    <ConfirmDialog
      :open="Boolean(confirmRequest)"
      :title="confirmRequest ? confirmRequest.title : ''"
      :description="confirmRequest ? confirmRequest.description : ''"
      :confirm-label="confirmRequest ? confirmRequest.confirmLabel : 'Confirm'"
      @confirm="handleConfirm"
      @cancel="confirmRequest = null"
    />

    <ToastStack :center="notifications" />
  </div>
</template>

<script>
import TopBar from './components/TopBar.vue';
import PageHeader from './components/PageHeader.vue';
import OverviewPanel from './components/OverviewPanel.vue';
import ListPanel from './components/ListPanel.vue';
import CommandPalette from './components/CommandPalette.vue';
import ConfirmDialog from './components/ConfirmDialog.vue';
import ToastStack from './components/ToastStack.vue';
import { loadSettings, subscribeSettings, updateSettings } from '../../settings';
import notificationCenter from '../../notifications';
import {
  ADMIN_TABS,
  BULK_ACTIONS,
  ACTION_VERBS,
  ACTION_PAST_TENSE,
  entityNoun,
  createInitialState,
  createTextMatcher,
  fullCorpus,
  corpusForTab,
  rowsForTab,
  paletteDescriptors,
  setUsersBlocked,
  setRunnersStatus,
  removeRunners,
  setProjectsArchived,
  removeProjects,
} from './data';

export default {
  name: 'Admin',
  components: { TopBar, PageHeader, OverviewPanel, ListPanel, CommandPalette, ConfirmDialog, ToastStack },
  props: {
    title: { type: String, default: 'Admin area' },
    accountName: { type: String, default: '' },
    accountInitials: { type: String, default: '' },
    initialData: { type: Object, default: () => ({}) },
    statCards: { type: Array, default: () => [] },
    instanceHealth: { type: Array, default: () => [] },
    permissions: { type: Object, default: () => ({}) },
    actionAdapter: { type: Function, default: null },
    // Optional standalone notification centre override, for host-app wiring/tests.
    notifications: { type: Object, default: () => notificationCenter },
  },
  data() {
    return {
      ...createInitialState({
        ...(this.initialData || {}),
        users: this.initialData.users || [],
        runners: this.initialData.runners || [],
        projects: this.initialData.projects || [],
      }),
      themeAttr: this.resolveThemeAttr(),
      ADMIN_TABS,
      statCards: this.statCards,
      instanceHealth: this.instanceHealth,
    };
  },
  computed: {
    dark() {
      return this.themeAttr === 'dark';
    },
    corpus() {
      return fullCorpus({ users: this.users, runners: this.runners, projects: this.projects });
    },
    tabCorpus() {
      return corpusForTab(this.tab, { users: this.users, runners: this.runners, projects: this.projects });
    },
    rows() {
      if (this.tab === 'Overview') return [];
      const searchMatcher = createTextMatcher(this.search, this.searchRegexMode);
      const listMatcher = createTextMatcher(this.listQuery, this.listRegexMode);
      const combined = {
        test: (text) => searchMatcher.test(text) && listMatcher.test(text),
        invalid: searchMatcher.invalid || listMatcher.invalid,
      };
      return rowsForTab(this.tab, { users: this.users, runners: this.runners, projects: this.projects }, combined);
    },
    selectedIds() {
      return this.selectedByTab[this.tab] || [];
    },
    bulkActions() {
      const actions = BULK_ACTIONS[this.tab] || [];
      const allowed = this.permissions[this.tab];
      return Array.isArray(allowed) ? actions.filter((action) => allowed.includes(action.id)) : actions;
    },
    paletteActions() {
      return paletteDescriptors().map((descriptor) => {
        if (descriptor.id === 'theme') {
          return { ...descriptor, icon: this.dark ? 'sun' : 'moon', run: () => this.toggleTheme() };
        }
        const tabName = descriptor.id.slice('tab:'.length);
        return { ...descriptor, run: () => this.setTab(tabName) };
      });
    },
  },
  created() {
    this.unsubscribeSettings = subscribeSettings(() => {
      this.themeAttr = this.resolveThemeAttr();
    });
  },
  mounted() {
    this._onGlobalKeydown = this.onGlobalKeydown.bind(this);
    window.addEventListener('keydown', this._onGlobalKeydown);
  },
  beforeDestroy() {
    if (this.unsubscribeSettings) this.unsubscribeSettings();
    window.removeEventListener('keydown', this._onGlobalKeydown);
  },
  methods: {
    resolveThemeAttr() {
      const { theme } = loadSettings();
      return theme === 'light' || theme === 'dark' ? theme : undefined;
    },
    toggleTheme() {
      const next = this.dark ? 'light' : 'dark';
      updateSettings({ theme: next });
      this.themeAttr = next;
    },
    setTab(tab) {
      this.tab = tab;
    },
    onGlobalKeydown(event) {
      // A confirmation gate is modal — never let the palette shortcut reach behind it.
      if (this.confirmRequest) return;
      if (event.ctrlKey && event.shiftKey && (event.key === 'F' || event.key === 'f')) {
        event.preventDefault();
        this.paletteOpen = true;
      } else if (event.key === 'Escape' && this.paletteOpen) {
        this.paletteOpen = false;
      }
    },
    toggleSelect(id) {
      const ids = this.selectedByTab[this.tab] || [];
      const next = ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id];
      this.$set(this.selectedByTab, this.tab, next);
    },
    toggleSelectAll() {
      const ids = this.selectedByTab[this.tab] || [];
      const rowIds = this.rows.map((row) => row.id);
      const allSelected = rowIds.length > 0 && rowIds.every((id) => ids.includes(id));
      this.$set(this.selectedByTab, this.tab, allSelected ? [] : rowIds);
    },
    invertSelection() {
      const selected = new Set(this.selectedByTab[this.tab] || []);
      const next = this.rows.filter((row) => !selected.has(row.id)).map((row) => row.id);
      this.$set(this.selectedByTab, this.tab, next);
    },
    clearFilters() {
      this.search = '';
      this.searchRegexMode = false;
      this.listQuery = '';
      this.listRegexMode = false;
    },
    async performEntityAction(tab, actionId, ids) {
      if (this.actionAdapter) {
        const result = await this.actionAdapter({ tab, actionId, ids });
        if (!result || result.ok === false) throw new Error((result && result.error) || 'The action was not completed.');
        if (result.data) {
          this.users = result.data.users || this.users;
          this.runners = result.data.runners || this.runners;
          this.projects = result.data.projects || this.projects;
        }
        return;
      }
      if (tab === 'Users') {
        if (actionId === 'block') this.users = setUsersBlocked(this.users, ids, true);
        if (actionId === 'unblock') this.users = setUsersBlocked(this.users, ids, false);
      } else if (tab === 'Runners') {
        if (actionId === 'pause') this.runners = setRunnersStatus(this.runners, ids, 'paused');
        if (actionId === 'resume') this.runners = setRunnersStatus(this.runners, ids, 'online');
        if (actionId === 'remove') this.runners = removeRunners(this.runners, ids);
      } else if (tab === 'Projects') {
        if (actionId === 'archive') this.projects = setProjectsArchived(this.projects, ids, true);
        if (actionId === 'unarchive') this.projects = setProjectsArchived(this.projects, ids, false);
        if (actionId === 'remove') this.projects = removeProjects(this.projects, ids);
      }
    },
    /** Row and bulk actions share this: destructive ones open the confirmation gate first. */
    requestAction(actionId, ids) {
      if (!ids.length) return;
      const descriptor = (BULK_ACTIONS[this.tab] || []).find((entry) => entry.id === actionId);
      const destructive = descriptor ? descriptor.destructive : false;
      const verb = ACTION_VERBS[actionId] || actionId;
      const noun = entityNoun(this.tab, ids.length);
      const label = descriptor ? descriptor.label.replace(' selected', '') : verb;
      const run = async () => {
        try {
          await this.performEntityAction(this.tab, actionId, ids);
        } catch (error) {
          this.notifications.notify({ title: 'Action failed', message: error.message, severity: 'error' });
          return;
        }
        this.notifications.notify({
          title: label,
          message: `${ids.length} ${noun} ${ACTION_PAST_TENSE[actionId] || 'updated'}.`,
          severity: destructive ? 'warning' : 'success',
        });
        const remaining = (this.selectedByTab[this.tab] || []).filter((id) => !ids.includes(id));
        this.$set(this.selectedByTab, this.tab, remaining);
      };
      if (destructive) {
        this.confirmRequest = {
          title: `${label} ${ids.length} ${noun}?`,
          description: `This will ${verb} ${ids.length} ${noun} in this GitLab instance. This cannot be undone from here.`,
          confirmLabel: label,
          onConfirm: run,
        };
      } else {
        run();
      }
    },
    handleConfirm() {
      if (this.confirmRequest) this.confirmRequest.onConfirm();
      this.confirmRequest = null;
    },
    signOut() {
      this.notifications.notify({ title: 'Signing out', message: 'Redirecting to sign-out…', severity: 'info', timeout: 2500 });
      window.location.assign('/users/sign_out');
    },
  },
};
</script>

<style lang="scss" src="./admin.scss"></style>
