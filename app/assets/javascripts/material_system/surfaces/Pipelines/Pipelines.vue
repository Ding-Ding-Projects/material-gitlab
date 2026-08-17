<template>
  <div class="mgl-pipelines" :data-mgl-theme="themeAttrValue">
    <top-bar
      :search="search"
      :regex-mode="regexMode"
      :dark="dark"
      @update:search="search = $event"
      @toggle-regex-mode="regexMode = !regexMode"
      @open-regex-builder="regexOpen = true"
      @open-palette="paletteOpen = true"
      @toggle-theme="toggleTheme"
    />

    <template v-if="!detail">
      <list-header :count-label="countLabel" @run="runPipeline" />
      <filter-bar :filters="filters" @toggle="toggleFilter" />
      <bulk-actions-bar
        v-if="selectedVisibleIds.length"
        :selected-count="selectedVisibleIds.length"
        :total-visible="visiblePipelines.length"
        @invert="invertSelection"
        @retry="bulkRetry"
        @cancel="bulkCancel"
        @delete="bulkDelete"
        @clear="selectedIds = []"
      />
      <main class="mgl-pl-main">
        <pipeline-list
          :pipelines="visiblePipelines"
          :selected-ids="selectedVisibleIds"
          @open="openDetail"
          @toggle-select="toggleSelect"
          @toggle-select-all="toggleSelectAll"
        />
      </main>
    </template>

    <pipeline-detail
      v-else
      :pipeline="detail"
      :active-job-key="activeJobKey"
      :active-job="activeJob"
      :active-job-log="activeJobLog"
      @back="backToList"
      @retry="retryPipeline"
      @cancel="cancelPipeline"
      @pick-job="activeJobKey = $event"
      @retry-job="retryJob"
    />

    <regex-builder-popover
      v-if="regexOpen"
      :initial-pattern="regexInitial"
      :corpus="regexCorpus"
      corpus-title="Matches in pipelines"
      @apply="applyRegex"
      @close="regexOpen = false"
    />
    <command-palette v-if="paletteOpen" :actions="paletteActions" @close="paletteOpen = false" />
    <confirm-dialog
      v-if="confirmAction"
      :title="confirmAction.title"
      :message="confirmAction.message"
      :confirm-label="confirmAction.confirmLabel"
      @confirm="acceptConfirm"
      @cancel="dismissConfirm"
    />

    <toast-stack />
  </div>
</template>

<script>
import { loadSettings, updateSettings, subscribeSettings } from '../../settings';
import { notificationCenter } from '../../notifications';
import {
  createInitialPipelines,
  createManualPipeline,
  retriedPipeline,
  canceledPipeline,
  retriedJob,
  buildJobLog,
} from './data';
import TopBar from './components/TopBar.vue';
import ListHeader from './components/ListHeader.vue';
import FilterBar from './components/FilterBar.vue';
import BulkActionsBar from './components/BulkActionsBar.vue';
import PipelineList from './components/PipelineList.vue';
import PipelineDetail from './components/PipelineDetail.vue';
import RegexBuilderPopover from './components/RegexBuilderPopover.vue';
import CommandPalette from './components/CommandPalette.vue';
import ConfirmDialog from './components/ConfirmDialog.vue';
import ToastStack from './components/ToastStack.vue';

export default {
  name: 'PipelinesSurface',
  components: {
    TopBar,
    ListHeader,
    FilterBar,
    BulkActionsBar,
    PipelineList,
    PipelineDetail,
    RegexBuilderPopover,
    CommandPalette,
    ConfirmDialog,
    ToastStack,
  },
  data() {
    return {
      settings: loadSettings(),
      systemPrefersDark: false,
      search: '',
      regexMode: false,
      regexOpen: false,
      paletteOpen: false,
      detailId: null,
      activeJobKey: null,
      filters: { failed: false, running: false },
      pipelines: createInitialPipelines(),
      selectedIds: [],
      confirmAction: null,
      pendingConfirmFn: null,
    };
  },
  computed: {
    dark() {
      if (this.settings.theme === 'dark') return true;
      if (this.settings.theme === 'light') return false;
      return this.systemPrefersDark;
    },
    themeAttrValue() {
      return this.settings.theme === 'system' ? null : this.settings.theme;
    },
    visiblePipelines() {
      const test = this.matcher();
      const f = this.filters;
      return this.pipelines.filter(
        (p) =>
          (!f.failed || p.status === 'failed') &&
          (!f.running || p.status === 'running') &&
          test(`${p.title} ${p.branch} #${p.id} ${p.sha}`),
      );
    },
    countLabel() {
      return `${this.visiblePipelines.length} pipelines`;
    },
    selectedVisibleIds() {
      const visibleIds = new Set(this.visiblePipelines.map((p) => p.id));
      return this.selectedIds.filter((id) => visibleIds.has(id));
    },
    detail() {
      return this.pipelines.find((p) => p.id === this.detailId) || null;
    },
    activeJob() {
      if (!this.detail || !this.activeJobKey) return null;
      let found = null;
      this.detail.stages.forEach((stage) => {
        stage.jobs.forEach((job) => {
          if (`${stage.name}:${job.key}` === this.activeJobKey) found = job;
        });
      });
      return found;
    },
    activeJobLog() {
      return this.activeJob ? buildJobLog(this.activeJob) : [];
    },
    regexInitial() {
      return this.regexMode ? this.search : '';
    },
    regexCorpus() {
      return this.pipelines.map((p) => `#${p.id}  ${p.title}  ${p.branch}  ${p.status}`);
    },
    paletteActions() {
      const actions = [
        { label: 'Toggle dark theme', icon: 'dark_mode', run: this.toggleTheme },
        { label: 'Run pipeline', icon: 'play_arrow', run: this.runPipeline },
      ];
      if (this.detail) {
        actions.push(
          { label: 'Back to pipelines list', icon: 'arrow_back', run: this.backToList },
          { label: 'Retry this pipeline', icon: 'replay', run: this.retryPipeline },
          { label: 'Cancel this pipeline', icon: 'cancel', run: this.cancelPipeline },
        );
      }
      return actions;
    },
  },
  mounted() {
    this.onKeydown = (event) => {
      if (event.ctrlKey && event.shiftKey && (event.key === 'F' || event.key === 'f')) {
        event.preventDefault();
        this.paletteOpen = true;
      }
      if (event.key === 'Escape') {
        this.paletteOpen = false;
        this.regexOpen = false;
      }
    };
    window.addEventListener('keydown', this.onKeydown);

    this.unsubscribeSettings = subscribeSettings((next) => {
      this.settings = next;
    });

    if (window.matchMedia) {
      this.systemThemeQuery = window.matchMedia('(prefers-color-scheme: dark)');
      this.systemPrefersDark = this.systemThemeQuery.matches;
      this.onSystemThemeChange = (event) => {
        this.systemPrefersDark = event.matches;
      };
      if (this.systemThemeQuery.addEventListener) {
        this.systemThemeQuery.addEventListener('change', this.onSystemThemeChange);
      }
    }
  },
  beforeDestroy() {
    window.removeEventListener('keydown', this.onKeydown);
    if (this.unsubscribeSettings) this.unsubscribeSettings();
    if (this.systemThemeQuery && this.systemThemeQuery.removeEventListener) {
      this.systemThemeQuery.removeEventListener('change', this.onSystemThemeChange);
    }
  },
  methods: {
    matcher() {
      const query = this.search;
      if (!query) return () => true;
      if (this.regexMode) {
        try {
          const re = new RegExp(query, 'i');
          return (text) => re.test(text);
        } catch (_error) {
          return () => true;
        }
      }
      const lowered = query.toLowerCase();
      return (text) => text.toLowerCase().includes(lowered);
    },
    toggleTheme() {
      const next = this.dark ? 'light' : 'dark';
      const result = updateSettings({ theme: next });
      if (result.ok) this.settings = result.value;
    },
    toggleFilter(key) {
      this.filters = { ...this.filters, [key]: !this.filters[key] };
    },
    applyRegex(pattern) {
      this.search = pattern;
      this.regexMode = true;
      this.regexOpen = false;
    },
    updatePipeline(id, transform) {
      this.pipelines = this.pipelines.map((p) => (p.id === id ? transform(p) : p));
    },
    openDetail(id) {
      this.detailId = id;
      this.activeJobKey = null;
    },
    backToList() {
      this.detailId = null;
      this.activeJobKey = null;
    },
    runPipeline() {
      const created = createManualPipeline(this.pipelines);
      this.pipelines = [created, ...this.pipelines];
      notificationCenter.notify({
        title: 'Pipeline started',
        message: `Pipeline #${created.id} is running on ${created.branch}.`,
        severity: 'info',
        actions: [
          {
            id: 'view',
            label: 'View',
            run: () => {
              this.openDetail(created.id);
            },
          },
        ],
      });
    },
    retryPipeline() {
      if (!this.detail) return;
      const id = this.detail.id;
      this.updatePipeline(id, retriedPipeline);
      notificationCenter.notify({ title: 'Retrying pipeline', message: `Pipeline #${id} is running again.`, severity: 'info' });
    },
    cancelPipeline() {
      if (!this.detail) return;
      const id = this.detail.id;
      this.confirmAction = {
        title: 'Cancel this pipeline?',
        message: `Running and pending jobs in pipeline #${id} will be stopped. This cannot be undone.`,
        confirmLabel: 'Cancel pipeline',
      };
      this.pendingConfirmFn = () => {
        this.updatePipeline(id, canceledPipeline);
        notificationCenter.notify({ title: 'Pipeline canceled', message: `Pipeline #${id} was canceled.`, severity: 'warning' });
      };
    },
    retryJob() {
      if (!this.detail || !this.activeJobKey) return;
      const id = this.detail.id;
      const key = this.activeJobKey;
      const jobName = this.activeJob ? this.activeJob.name : 'Job';
      this.updatePipeline(id, (p) => retriedJob(p, key));
      notificationCenter.notify({ title: 'Retrying job', message: `${jobName} is running again.`, severity: 'info' });
    },
    toggleSelect(id) {
      this.selectedIds = this.selectedIds.includes(id)
        ? this.selectedIds.filter((existing) => existing !== id)
        : [...this.selectedIds, id];
    },
    toggleSelectAll() {
      const visibleIds = this.visiblePipelines.map((p) => p.id);
      const allSelected = visibleIds.length > 0 && visibleIds.every((id) => this.selectedIds.includes(id));
      if (allSelected) {
        const visibleSet = new Set(visibleIds);
        this.selectedIds = this.selectedIds.filter((id) => !visibleSet.has(id));
      } else {
        this.selectedIds = Array.from(new Set([...this.selectedIds, ...visibleIds]));
      }
    },
    invertSelection() {
      const visibleIds = this.visiblePipelines.map((p) => p.id);
      const selectedSet = new Set(this.selectedIds);
      visibleIds.forEach((id) => {
        if (selectedSet.has(id)) selectedSet.delete(id);
        else selectedSet.add(id);
      });
      this.selectedIds = Array.from(selectedSet);
    },
    bulkRetry() {
      const ids = this.selectedVisibleIds;
      if (!ids.length) return;
      const idSet = new Set(ids);
      this.pipelines = this.pipelines.map((p) => (idSet.has(p.id) ? retriedPipeline(p) : p));
      notificationCenter.notify({ title: 'Retrying pipelines', message: `Retried ${ids.length} pipeline${ids.length === 1 ? '' : 's'}.`, severity: 'info' });
    },
    bulkCancel() {
      const ids = this.selectedVisibleIds;
      if (!ids.length) return;
      this.confirmAction = {
        title: 'Cancel selected pipelines?',
        message: `Running and pending jobs in ${ids.length} pipeline${ids.length === 1 ? '' : 's'} will be stopped. This cannot be undone.`,
        confirmLabel: 'Cancel pipelines',
      };
      this.pendingConfirmFn = () => {
        const idSet = new Set(ids);
        this.pipelines = this.pipelines.map((p) => (idSet.has(p.id) ? canceledPipeline(p) : p));
        notificationCenter.notify({ title: 'Pipelines canceled', message: `Canceled ${ids.length} pipeline${ids.length === 1 ? '' : 's'}.`, severity: 'warning' });
        this.selectedIds = [];
      };
    },
    bulkDelete() {
      const ids = this.selectedVisibleIds;
      if (!ids.length) return;
      this.confirmAction = {
        title: 'Delete selected pipelines?',
        message: `This permanently removes ${ids.length} pipeline record${ids.length === 1 ? '' : 's'}. This cannot be undone.`,
        confirmLabel: 'Delete pipelines',
      };
      this.pendingConfirmFn = () => {
        const idSet = new Set(ids);
        if (this.detailId !== null && idSet.has(this.detailId)) this.backToList();
        this.pipelines = this.pipelines.filter((p) => !idSet.has(p.id));
        notificationCenter.notify({ title: 'Pipelines deleted', message: `Deleted ${ids.length} pipeline record${ids.length === 1 ? '' : 's'}.`, severity: 'success' });
        this.selectedIds = [];
      };
    },
    acceptConfirm() {
      const fn = this.pendingConfirmFn;
      this.confirmAction = null;
      this.pendingConfirmFn = null;
      if (fn) fn();
    },
    dismissConfirm() {
      this.confirmAction = null;
      this.pendingConfirmFn = null;
    },
  },
};
</script>

<style lang="scss" src="./pipelines.scss"></style>
