<template>
  <div class="build-surface" :class="{ 'build-surface--dark': isDark }">
    <div class="build-surface__body">
      <top-bar
        :search="search"
        @update:search="setSearch"
        :regex-mode="regexMode"
        @update:regex-mode="setRegexMode"
        :search-placeholder="searchPlaceholder"
        :search-label="searchLabel"
        :corpus="regexCorpus"
        :is-dark="isDark"
        :avatar-initials="avatarInitials"
        @open-palette="openPalette"
        @toggle-theme="toggleTheme"
      />

      <div class="build-surface__heading">
        <h1 class="build-surface__title">Build</h1>
        <tabs-nav :tabs="tabs" :active="activeTab" @change="setActiveTab" />
      </div>

      <main class="build-surface__main">
        <pipeline-editor
          v-if="isEditorTab"
          :yaml="yaml"
          :committed="yamlCommitted"
          :busy="yamlBusy"
          @update:yaml="setYaml"
          @commit="commitYaml"
        />
        <template v-else>
          <div v-if="loading[activeTab]" class="build-surface__status">Loading {{ activeTabMeta.label.toLowerCase() }}…</div>
          <div v-else-if="loadError[activeTab]" class="build-surface__status build-surface__status--error">
            <p>{{ loadError[activeTab] }}</p>
            <button type="button" class="btn btn--text" @click="reload(activeTab)">Retry</button>
          </div>
          <row-list
            v-else
            :tab-id="activeTab"
            :tab-label="activeTabMeta.label"
            :rows="viewRows"
            :total-all="collectionForActiveTab.length"
            :search-active="Boolean(search)"
            :selected-ids="selectedIdsForTab"
            :bulk-actions="bulkActions"
            @toggle="onToggleRow"
            @select-all="onSelectAll"
            @invert="onInvertSelection"
            @clear="onClearSelection"
            @clear-search="clearSearch"
          />
        </template>
      </main>
    </div>

    <command-palette-overlay v-if="paletteOpen" :actions="paletteActions" @close="closePalette" />

    <confirm-dialog
      v-if="confirm"
      :title="confirm.title"
      :message="confirm.message"
      :confirm-label="confirm.confirmLabel"
      :cancel-label="confirm.cancelLabel"
      :destructive="confirm.destructive"
      @confirm="confirmProceed"
      @cancel="closeConfirm"
    />

    <notification-host class="build-surface__notify" />
  </div>
</template>

<script>
import { loadSettings, updateSettings } from '../../settings';
import { notificationCenter } from '../../notifications';
import TopBar from './components/TopBar.vue';
import TabsNav from './components/TabsNav.vue';
import PipelineEditor from './components/PipelineEditor.vue';
import RowList from './components/RowList.vue';
import ConfirmDialog from './components/ConfirmDialog.vue';
import CommandPaletteOverlay from './components/CommandPaletteOverlay.vue';
import NotificationHost from './components/NotificationHost.vue';
import {
  BUILD_TABS,
  STATUS_META,
  DEFAULT_PIPELINE_YAML,
  fetchJobs,
  fetchSchedules,
  fetchTestCases,
  fetchArtifacts,
  fetchPipelineYaml,
  commitPipelineYaml,
  lintPipelineYaml,
  matchesQuery,
  retryJob,
  setScheduleActive,
  setTestCaseStatus,
  setArtifactKept,
  deleteArtifact,
  deleteArtifacts,
} from './data';
import { createGitLabClient } from '../gitlabApi';

export default {
  name: 'BuildSurface',
  components: {
    TopBar,
    TabsNav,
    PipelineEditor,
    RowList,
    ConfirmDialog,
    CommandPaletteOverlay,
    NotificationHost,
  },
  props: {
    projectPath: { type: String, required: true },
    currentUser: {
      type: Object,
      default: () => ({ name: '', initials: '' }),
    },
  },
  data() {
    return {
      tabs: BUILD_TABS,
      activeTab: 'jobs',
      search: '',
      regexMode: false,
      settings: loadSettings(),
      systemPrefersDark: typeof window !== 'undefined' && window.matchMedia
        ? window.matchMedia('(prefers-color-scheme: dark)').matches
        : false,
      jobs: [],
      schedules: [],
      testCases: [],
      artifacts: [],
      loading: { jobs: true, schedules: true, testCases: true, artifacts: true },
      loadError: { jobs: null, schedules: null, testCases: null, artifacts: null },
      selected: { jobs: [], schedules: [], testCases: [], artifacts: [] },
      yaml: DEFAULT_PIPELINE_YAML,
      yamlCommitted: false,
      yamlBusy: false,
      paletteOpen: false,
      confirm: null,
      lastFocused: null,
    };
  },
  computed: {
    isDark() {
      if (this.settings.theme === 'dark') return true;
      if (this.settings.theme === 'light') return false;
      return this.systemPrefersDark;
    },
    avatarInitials() {
      return (this.currentUser && this.currentUser.initials) || 'JD';
    },
    activeTabMeta() {
      return this.tabs.find((tab) => tab.id === this.activeTab) || this.tabs[0];
    },
    isEditorTab() {
      return this.activeTab === 'editor';
    },
    collectionForActiveTab() {
      return this[this.activeTab] || [];
    },
    filteredRaw() {
      const list = this.collectionForActiveTab;
      return list.filter((item) => matchesQuery(`${item.name} ${item.sub}`, this.search, this.regexMode));
    },
    viewRows() {
      const raw = this.filteredRaw;
      if (this.activeTab === 'jobs') return raw.map((job) => this.buildJobRow(job));
      if (this.activeTab === 'schedules') return raw.map((schedule) => this.buildScheduleRow(schedule));
      if (this.activeTab === 'testCases') return raw.map((testCase) => this.buildTestCaseRow(testCase));
      if (this.activeTab === 'artifacts') return raw.map((artifact) => this.buildArtifactRow(artifact));
      return [];
    },
    selectedIdsForTab() {
      return this.selected[this.activeTab] || [];
    },
    selectedRows() {
      const ids = this.selectedIdsForTab;
      return this.collectionForActiveTab.filter((item) => ids.includes(item.id));
    },
    bulkActions() {
      const rows = this.selectedRows;
      if (!rows.length) return [];
      if (this.activeTab === 'jobs') {
        const retryable = rows.filter((job) => job.status === 'failed' || job.status === 'manual');
        return retryable.length
          ? [{ id: 'retry', label: `Retry ${retryable.length} selected`, run: () => this.retryMany(retryable) }]
          : [];
      }
      if (this.activeTab === 'schedules') {
        const actions = [];
        const toPause = rows.filter((schedule) => schedule.active);
        const toResume = rows.filter((schedule) => !schedule.active);
        if (toPause.length) actions.push({ id: 'pause', label: `Pause ${toPause.length} selected`, run: () => this.setManySchedules(toPause, false) });
        if (toResume.length) actions.push({ id: 'resume', label: `Resume ${toResume.length} selected`, run: () => this.setManySchedules(toResume, true) });
        return actions;
      }
      if (this.activeTab === 'testCases') {
        const actions = [];
        const toQuarantine = rows.filter((testCase) => testCase.status !== 'quarantined');
        const toRestore = rows.filter((testCase) => testCase.status === 'quarantined');
        if (toQuarantine.length) actions.push({ id: 'quarantine', label: `Quarantine ${toQuarantine.length} selected`, run: () => this.setManyTestCaseStatus(toQuarantine, 'quarantined') });
        if (toRestore.length) actions.push({ id: 'restore', label: `Restore ${toRestore.length} selected`, run: () => this.setManyTestCaseStatus(toRestore, 'passing') });
        return actions;
      }
      if (this.activeTab === 'artifacts') {
        const actions = [];
        const toKeep = rows.filter((artifact) => !artifact.kept);
        const toUnkeep = rows.filter((artifact) => artifact.kept);
        if (toKeep.length) actions.push({ id: 'keep', label: `Keep ${toKeep.length} selected`, run: () => this.setManyArtifactsKept(toKeep, true) });
        if (toUnkeep.length) actions.push({ id: 'unkeep', label: `Allow ${toUnkeep.length} selected to expire`, run: () => this.setManyArtifactsKept(toUnkeep, false) });
        actions.push({ id: 'delete', label: `Delete ${rows.length} selected`, destructive: true, run: () => this.confirmDeleteArtifacts(rows) });
        return actions;
      }
      return [];
    },
    regexCorpus() {
      return [
        ...this.jobs.map((job) => `${job.name} ${job.status}`),
        ...this.schedules.map((schedule) => schedule.name),
        ...this.testCases.map((testCase) => testCase.name),
        ...this.artifacts.map((artifact) => artifact.name),
      ];
    },
    searchPlaceholder() {
      const noun = this.activeTabMeta.label.toLowerCase();
      return this.regexMode ? `Regex search — ${noun}` : `Search ${noun}`;
    },
    searchLabel() {
      return `Search ${this.activeTabMeta.label}`;
    },
    paletteActions() {
      return [
        { id: 'toggle-theme', label: 'Toggle dark theme', icon: 'dark_mode', run: () => this.toggleTheme() },
        ...this.tabs.map((tab) => ({
          id: `tab-${tab.id}`,
          label: `Build: ${tab.label}`,
          icon: 'construction',
          run: () => this.setActiveTab(tab.id),
        })),
      ];
    },
  },
  watch: {
    // Selection is scoped to the currently-visible (filtered) rows, so a
    // changed query never leaves a bulk action silently reaching a row the
    // user can no longer see.
    search() {
      this.clearSelection(this.activeTab);
    },
    regexMode() {
      this.clearSelection(this.activeTab);
    },
  },
  created() {
    this.api = createGitLabClient(this.projectPath);
    this.loadAll();
  },
  mounted() {
    this.onKeydown = (event) => {
      if (event.ctrlKey && event.shiftKey && (event.key === 'F' || event.key === 'f')) {
        event.preventDefault();
        this.openPalette();
      }
      if (event.key === 'Escape') {
        if (this.confirm) this.closeConfirm();
        else if (this.paletteOpen) this.closePalette();
      }
    };
    window.addEventListener('keydown', this.onKeydown);
    if (window.matchMedia) {
      this.media = window.matchMedia('(prefers-color-scheme: dark)');
      this.onMediaChange = (event) => { this.systemPrefersDark = event.matches; };
      if (this.media.addEventListener) this.media.addEventListener('change', this.onMediaChange);
      else if (this.media.addListener) this.media.addListener(this.onMediaChange);
    }
  },
  beforeDestroy() {
    window.removeEventListener('keydown', this.onKeydown);
    if (this.media) {
      if (this.media.removeEventListener) this.media.removeEventListener('change', this.onMediaChange);
      else if (this.media.removeListener) this.media.removeListener(this.onMediaChange);
    }
  },
  methods: {
    async loadAll() {
      ['jobs', 'schedules', 'testCases', 'artifacts'].forEach((key) => this.reload(key));
      try {
        this.yaml = await fetchPipelineYaml({ projectPath: this.projectPath, client: this.api });
      } catch (error) {
        this.$set(this.loadError, 'editor', error.message);
      }
    },
    async reload(tab) {
      const fetchers = { jobs: fetchJobs, schedules: fetchSchedules, testCases: fetchTestCases, artifacts: fetchArtifacts };
      const fetcher = fetchers[tab];
      if (!fetcher) return;
      this.$set(this.loading, tab, true);
      this.$set(this.loadError, tab, null);
      try {
        const data = await fetcher({ projectPath: this.projectPath, client: this.api });
        this[tab] = data;
      } catch (error) {
        this.$set(this.loadError, tab, (error && error.message) || `${this.tabs.find((t) => t.id === tab).label} could not be loaded.`);
      } finally {
        this.$set(this.loading, tab, false);
      }
    },
    setSearch(value) {
      this.search = value;
    },
    setRegexMode(value) {
      this.regexMode = value;
    },
    clearSearch() {
      this.search = '';
    },
    setActiveTab(id) {
      this.activeTab = id;
    },
    toggleTheme() {
      const next = this.isDark ? 'light' : 'dark';
      const result = updateSettings({ theme: next });
      if (result.ok) this.settings = result.value;
    },
    setYaml(value) {
      this.yaml = value;
      this.yamlCommitted = false;
    },
    async commitYaml() {
      const lint = lintPipelineYaml(this.yaml);
      if (!lint.valid || this.yamlBusy) return;
      this.yamlBusy = true;
      try {
        await commitPipelineYaml({ projectPath: this.projectPath, yaml: this.yaml, client: this.api });
        this.yamlCommitted = true;
        notificationCenter.notify({
          title: 'Pipeline configuration committed',
          message: `${lint.stages.length} stage${lint.stages.length === 1 ? '' : 's'} committed to main.`,
          severity: 'success',
        });
      } catch (error) {
        notificationCenter.notify({
          title: 'Commit failed',
          message: (error && error.message) || 'The pipeline configuration could not be committed.',
          severity: 'error',
        });
      } finally {
        this.yamlBusy = false;
      }
    },
    buildJobRow(job) {
      const meta = STATUS_META[job.status] || STATUS_META.created;
      const action = job.status === 'failed' || job.status === 'manual'
        ? { label: job.status === 'failed' ? 'Retry' : 'Play', color: 'var(--onprimc)', run: () => this.retryOne(job) }
        : null;
      return {
        id: job.id,
        icon: meta.icon,
        iconColor: meta.color,
        title: job.name,
        mono: true,
        sub: job.sub,
        badge: { text: job.status, bg: meta.container, fg: meta.color },
        metaText: job.when,
        action,
      };
    },
    buildScheduleRow(schedule) {
      return {
        id: schedule.id,
        icon: 'calendar_clock',
        iconColor: 'var(--prim)',
        title: schedule.name,
        mono: false,
        sub: schedule.sub,
        badge: {
          text: schedule.active ? 'active' : 'paused',
          bg: schedule.active ? 'var(--goodc)' : 'var(--surfch)',
          fg: schedule.active ? 'var(--good)' : 'var(--onsurfv)',
        },
        metaText: '',
        action: { label: schedule.active ? 'Pause' : 'Resume', color: 'var(--onprimc)', run: () => this.toggleScheduleOne(schedule) },
      };
    },
    buildTestCaseRow(testCase) {
      const meta = STATUS_META[testCase.status] || STATUS_META.passing;
      return {
        id: testCase.id,
        icon: 'labs',
        iconColor: 'var(--prim)',
        title: testCase.name,
        mono: false,
        sub: testCase.sub,
        badge: { text: testCase.status, bg: meta.container, fg: meta.color },
        metaText: '',
        action: null,
      };
    },
    buildArtifactRow(artifact) {
      const label = artifact.kept ? 'Kept' : artifact.expiresIn;
      return {
        id: artifact.id,
        icon: 'inventory_2',
        iconColor: 'var(--prim)',
        title: artifact.name,
        mono: true,
        sub: artifact.sub,
        badge: {
          text: label,
          bg: artifact.kept ? 'var(--primc)' : 'var(--surfch)',
          fg: artifact.kept ? 'var(--onprimc)' : 'var(--onsurfv)',
        },
        metaText: artifact.size,
        action: { label: 'Delete', color: 'var(--err)', run: () => this.confirmDeleteArtifact(artifact) },
      };
    },
    async retryOne(job) {
      try {
        const result = await retryJob({ projectPath: this.projectPath, id: job.id, client: this.api });
        this.jobs = this.jobs.map((item) => (item.id === job.id ? { ...item, status: result.status, when: result.when } : item));
        notificationCenter.notify({ title: 'Job retried', message: `${job.name} is running again.`, severity: 'info' });
      } catch (error) {
        notificationCenter.notify({ title: 'Retry failed', message: (error && error.message) || `${job.name} could not be retried.`, severity: 'error' });
      }
    },
    async retryMany(jobs) {
      try {
        await Promise.all(jobs.map((job) => retryJob({ projectPath: this.projectPath, id: job.id, client: this.api })));
        const ids = jobs.map((job) => job.id);
        this.jobs = this.jobs.map((item) => (ids.includes(item.id) ? { ...item, status: 'running', when: '00:01' } : item));
        this.clearSelection('jobs');
        notificationCenter.notify({ title: `${ids.length} job(s) retried`, severity: 'info' });
      } catch (error) {
        notificationCenter.notify({ title: 'Retry failed', message: (error && error.message) || 'Some jobs could not be retried.', severity: 'error' });
      }
    },
    async toggleScheduleOne(schedule) {
      const next = !schedule.active;
      try {
        await setScheduleActive({ projectPath: this.projectPath, id: schedule.id, active: next, client: this.api });
        this.schedules = this.schedules.map((item) => (item.id === schedule.id ? { ...item, active: next } : item));
        notificationCenter.notify({ title: next ? 'Schedule resumed' : 'Schedule paused', message: schedule.name, severity: 'info' });
      } catch (error) {
        notificationCenter.notify({ title: 'Could not update the schedule', message: (error && error.message) || schedule.name, severity: 'error' });
      }
    },
    async setManySchedules(schedules, active) {
      try {
        await Promise.all(schedules.map((schedule) => setScheduleActive({ projectPath: this.projectPath, id: schedule.id, active, client: this.api })));
        const ids = schedules.map((schedule) => schedule.id);
        this.schedules = this.schedules.map((item) => (ids.includes(item.id) ? { ...item, active } : item));
        this.clearSelection('schedules');
        notificationCenter.notify({ title: `${ids.length} schedule(s) ${active ? 'resumed' : 'paused'}`, severity: 'info' });
      } catch (error) {
        notificationCenter.notify({ title: 'Could not update schedules', message: (error && error.message) || '', severity: 'error' });
      }
    },
    async setManyTestCaseStatus(testCases, status) {
      try {
        await Promise.all(testCases.map((testCase) => setTestCaseStatus({ projectPath: this.projectPath, id: testCase.id, status, client: this.api })));
        const ids = testCases.map((testCase) => testCase.id);
        this.testCases = this.testCases.map((item) => (ids.includes(item.id) ? { ...item, status } : item));
        this.clearSelection('testCases');
        notificationCenter.notify({ title: `${ids.length} test case(s) marked ${status}`, severity: 'info' });
      } catch (error) {
        notificationCenter.notify({ title: 'Could not update test cases', message: (error && error.message) || '', severity: 'error' });
      }
    },
    async setManyArtifactsKept(artifacts, kept) {
      try {
        await Promise.all(artifacts.map((artifact) => setArtifactKept({ projectPath: this.projectPath, id: artifact.id, kept, client: this.api })));
        const ids = artifacts.map((artifact) => artifact.id);
        this.artifacts = this.artifacts.map((item) => (ids.includes(item.id) ? { ...item, kept } : item));
        this.clearSelection('artifacts');
        notificationCenter.notify({
          title: kept ? `${ids.length} artifact(s) kept` : `${ids.length} artifact(s) will expire`,
          severity: 'info',
        });
      } catch (error) {
        notificationCenter.notify({ title: 'Could not update artifacts', message: (error && error.message) || '', severity: 'error' });
      }
    },
    confirmDeleteArtifact(artifact) {
      this.lastFocused = document.activeElement;
      this.confirm = {
        title: 'Delete artifact',
        message: `"${artifact.name}" (${artifact.size}) will be permanently deleted and cannot be recovered.`,
        confirmLabel: 'Delete artifact',
        cancelLabel: 'Cancel',
        destructive: true,
        onConfirm: async () => {
          await deleteArtifact({ projectPath: this.projectPath, id: artifact.id, client: this.api });
          this.artifacts = this.artifacts.filter((item) => item.id !== artifact.id);
          this.selected.artifacts = this.selected.artifacts.filter((id) => id !== artifact.id);
          notificationCenter.notify({ title: 'Artifact deleted', message: `${artifact.name} was deleted.`, severity: 'success' });
        },
      };
    },
    confirmDeleteArtifacts(rows) {
      this.lastFocused = document.activeElement;
      const names = rows.map((row) => row.name).join(', ');
      this.confirm = {
        title: `Delete ${rows.length} artifacts`,
        message: `${names} will be permanently deleted and cannot be recovered.`,
        confirmLabel: `Delete ${rows.length} artifacts`,
        cancelLabel: 'Cancel',
        destructive: true,
        onConfirm: async () => {
          const ids = rows.map((row) => row.id);
          await deleteArtifacts({ projectPath: this.projectPath, ids, client: this.api });
          this.artifacts = this.artifacts.filter((item) => !ids.includes(item.id));
          this.selected.artifacts = this.selected.artifacts.filter((id) => !ids.includes(id));
          notificationCenter.notify({ title: `${ids.length} artifacts deleted`, severity: 'success' });
        },
      };
    },
    async confirmProceed() {
      const active = this.confirm;
      this.confirm = null;
      if (active && active.onConfirm) await active.onConfirm();
      this.$nextTick(() => { if (this.lastFocused && this.lastFocused.focus) this.lastFocused.focus(); });
    },
    closeConfirm() {
      this.confirm = null;
      this.$nextTick(() => { if (this.lastFocused && this.lastFocused.focus) this.lastFocused.focus(); });
    },
    onToggleRow(id) {
      const tab = this.activeTab;
      const current = new Set(this.selected[tab]);
      if (current.has(id)) current.delete(id); else current.add(id);
      this.$set(this.selected, tab, Array.from(current));
    },
    onSelectAll() {
      this.$set(this.selected, this.activeTab, this.viewRows.map((row) => row.id));
    },
    onInvertSelection() {
      const tab = this.activeTab;
      const current = new Set(this.selected[tab]);
      const next = this.viewRows.map((row) => row.id).filter((id) => !current.has(id));
      this.$set(this.selected, tab, next);
    },
    onClearSelection() {
      this.clearSelection(this.activeTab);
    },
    clearSelection(tab) {
      this.$set(this.selected, tab, []);
    },
    openPalette() {
      this.lastFocused = document.activeElement;
      this.paletteOpen = true;
    },
    closePalette() {
      this.paletteOpen = false;
      this.$nextTick(() => { if (this.lastFocused && this.lastFocused.focus) this.lastFocused.focus(); });
    },
  },
};
</script>

<style lang="scss" src="./build.scss"></style>
