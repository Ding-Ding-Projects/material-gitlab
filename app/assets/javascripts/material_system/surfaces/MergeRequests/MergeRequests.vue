<template>
  <div class="mr-app" :data-theme="dark ? 'dark' : 'light'" data-material-topbar-owner="surface.merge-requests">
    <mr-top-bar
      :search="search"
      :regex-mode="regexMode"
      :regex-popover-open="regexPopoverOpen"
      :dark="dark"
      :corpus="corpus"
      :avatar-initials="avatarInitials"
      :avatar-label="avatarLabel"
      @update:search="search = $event"
      @toggle-regex-mode="regexMode = !regexMode"
      @open-regex-builder="regexPopoverOpen = true"
      @close-regex-builder="regexPopoverOpen = false"
      @apply-regex="applyRegex"
      @open-palette="paletteOpen = true"
      @toggle-theme="toggleDark"
    />

    <template v-if="!currentDetail">
      <mr-list-header :count="filteredMrs.length" :can-create="!production || permissions.create === true" :new-path="newMergeRequestPath" @create="createMergeRequest" />
      <mr-filter-chips :filters="filters" @toggle="toggleFilter" />
      <p v-if="production && regexMode">Regular expressions filter the current page.</p>
      <mr-bulk-action-bar
        v-if="selectedIds.length && (!production || permissions.update === true)"
        :selected-count="selectedIds.length"
        :total-count="filteredMrs.length"
        :closeable-count="closeableSelectedCount"
        @clear-selection="selectNone"
        @close-selected="requestCloseSelected"
      />
      <main class="mr-list-main">
        <div v-if="loading" class="mr-list">
          <div class="mr-list__empty" role="status">Loading merge requests…</div>
        </div>
        <div v-else-if="loadError" role="alert">
          <p>Merge requests could not be loaded: {{ loadError.message }}</p>
          <gl-button @click="loadListPage">Retry</gl-button>
        </div>
        <mr-list
          v-else
          :mrs="filteredMrs"
          :selected-ids="selectedIds"
          @toggle-select="toggleSelect"
          @open="openDetail"
          @select-all="selectAll"
          @select-none="selectNone"
          @invert-selection="invertSelection"
        />
        <nav v-if="production && !loading && !loadError" aria-label="Merge request pages">
          <gl-button :disabled="page <= 1" @click="changePage(page - 1)">Previous</gl-button>
          <span>Page {{ page }}<template v-if="totalPages"> of {{ totalPages }}</template></span>
          <gl-button :disabled="!hasNextPage" @click="changePage(page + 1)">Next</gl-button>
        </nav>
      </main>
    </template>

    <mr-detail
      v-else
      :key="currentDetail.id"
      :mr="currentDetail"
      @back="detailId = null"
      @toggle-approve="onToggleApprove"
      @merge-complete="onMergeComplete"
      @add-comment="onAddComment"
      @toggle-resolve="onToggleResolve"
    />

    <mr-command-palette v-if="paletteOpen" :actions="paletteActions" @close="paletteOpen = false" />
    <mr-confirm-dialog
      :open="confirmDialog.open"
      :title="confirmDialog.title"
      :message="confirmDialog.message"
      :confirm-label="confirmDialog.confirmLabel"
      @confirm="runConfirmedAction"
      @cancel="confirmDialog = { ...confirmDialog, open: false }"
    />
    <mr-toast-host />
  </div>
</template>

<script>
import { GlButton } from '@gitlab/ui';
import MrTopBar from './components/MrTopBar.vue';
import MrListHeader from './components/MrListHeader.vue';
import MrFilterChips from './components/MrFilterChips.vue';
import MrBulkActionBar from './components/MrBulkActionBar.vue';
import MrList from './components/MrList.vue';
import MrDetail from './components/MrDetail.vue';
import MrCommandPalette from './components/MrCommandPalette.vue';
import MrConfirmDialog from './components/MrConfirmDialog.vue';
import MrToastHost from './components/MrToastHost.vue';
import {
  fetchMergeRequests,
  fetchMergeRequestDetail,
  matchesFilters,
  buildQueryMatcher,
  searchableText,
  toggleApproval,
  markMerged,
  appendComment,
  toggleThreadResolved,
  closeMergeRequests,
  DEFAULT_FILTERS,
  FILTER_DEFS,
} from './data';
import { createGitLabClient } from '../gitlabApi';
import notificationCenter from '~/material_system/notifications';
import { loadSettings, updateSettings } from '~/material_system/settings';

export default {
  name: 'MergeRequestsSurface',
  components: {
    GlButton,
    MrTopBar,
    MrListHeader,
    MrFilterChips,
    MrBulkActionBar,
    MrList,
    MrDetail,
    MrCommandPalette,
    MrConfirmDialog,
    MrToastHost,
  },
  props: {
    projectPath: { type: String, required: true },
    currentUser: { type: Object, default: () => ({ name: '', initials: '' }) },
    production: { type: Boolean, default: false },
    permissions: { type: Object, default: () => ({}) },
    listAdapter: { type: Object, default: null },
    newMergeRequestPath: { type: String, default: '' },
    navigate: { type: Function, default: (url) => window.location.assign(url) },
  },
  data() {
    return {
      dark: false,
      search: '',
      regexMode: false,
      regexPopoverOpen: false,
      paletteOpen: false,
      detailId: null,
      filters: { ...DEFAULT_FILTERS },
      selectedIds: [],
      mrs: [],
      loading: true,
      avatarInitials: this.currentUser.initials || '',
      avatarLabel: 'Signed in user',
      confirmDialog: { open: false, title: '', message: '', confirmLabel: 'Confirm', action: null },
      loadError: null,
      page: 1,
      totalPages: null,
      hasNextPage: false,
      mutationPending: false,
    };
  },
  computed: {
    filteredMrs() {
      const matches = buildQueryMatcher(this.search, this.regexMode);
      return this.mrs.filter((mr) => matchesFilters(mr, this.production ? { ...this.filters, mine: false } : this.filters, this.currentUser.name) && matches(searchableText(mr)));
    },
    currentDetail() {
      if (this.production) return null;
      return this.mrs.find((mr) => mr.id === this.detailId) || null;
    },
    corpus() {
      return this.mrs.map(searchableText);
    },
    closeableSelectedCount() {
      return this.mrs.filter((mr) => this.selectedIds.includes(mr.id) && mr.state === 'Open').length;
    },
    paletteActions() {
      const actions = [
        { label: 'Toggle dark theme', icon: 'dark_mode', run: this.toggleDark },
        { label: 'Toggle regex search mode', icon: 'construction', run: () => { this.regexMode = !this.regexMode; } },
      ];
      if (this.currentDetail) {
        actions.push({ label: 'Back to merge requests list', icon: 'arrow_back', run: () => { this.detailId = null; } });
      } else {
        if (!this.production || this.permissions.create === true) actions.push({ label: 'New merge request', icon: 'add', run: this.createMergeRequest });
        FILTER_DEFS.forEach((def) => {
          actions.push({ label: `Toggle filter: ${def.label}`, icon: 'filter_alt', run: () => this.toggleFilter(def.key) });
        });
      }
      return actions;
    },
  },
  watch: {
    search() {
      if (!this.production) return;
      clearTimeout(this.searchTimer);
      this.page = 1;
      this.searchTimer = setTimeout(() => this.loadListPage(), 250);
    },
    regexMode() {
      if (this.production) { this.page = 1; this.loadListPage(); }
    },
    filteredMrs(list) {
      const visible = new Set(list.map((mr) => mr.id));
      this.selectedIds = this.selectedIds.filter((id) => visible.has(id));
    },
  },
  created() {
    const settings = loadSettings();
    const prefersDark = Boolean(
      settings.theme === 'system' &&
        window.matchMedia &&
        window.matchMedia('(prefers-color-scheme: dark)').matches,
    );
    this.dark = settings.theme === 'dark' || prefersDark;
  },
  mounted() {
    if (this.production) this.loadListPage();
    else {
    this.api = createGitLabClient(this.projectPath);
    fetchMergeRequests({ projectPath: this.projectPath, client: this.api }).then((mrs) => {
      this.mrs = mrs;
    }).catch((error) => {
      this.loadError = error;
    }).finally(() => { this.loading = false; });
    }
    this.onKeydown = (event) => {
      if (event.ctrlKey && event.shiftKey && (event.key === 'F' || event.key === 'f')) {
        event.preventDefault();
        this.paletteOpen = true;
      }
    };
    window.addEventListener('keydown', this.onKeydown);
  },
  beforeDestroy() {
    clearTimeout(this.searchTimer);
    this.loadGeneration = (this.loadGeneration || 0) + 1;
    window.removeEventListener('keydown', this.onKeydown);
  },
  methods: {
    async loadListPage() {
      if (!this.production || !this.listAdapter) return;
      const generation = (this.loadGeneration || 0) + 1;
      this.loadGeneration = generation;
      this.loading = true;
      this.loadError = null;
      try {
        const state = this.filters.open && !this.filters.merged ? 'opened' : this.filters.merged && !this.filters.open ? 'merged' : 'all';
        const result = await this.listAdapter.listPage({ page: this.page, state, mine: this.filters.mine, search: this.regexMode ? '' : this.search });
        if (generation !== this.loadGeneration) return;
        this.mrs = result.items;
        this.totalPages = result.totalPages;
        this.hasNextPage = result.hasNextPage;
      } catch (error) { if (generation === this.loadGeneration) this.loadError = error; }
      finally { if (generation === this.loadGeneration) this.loading = false; }
    },
    changePage(page) {
      if (page < 1 || (page > this.page && !this.hasNextPage)) return;
      this.page = page;
      this.loadListPage();
    },
    toggleDark() {
      this.dark = !this.dark;
      updateSettings({ theme: this.dark ? 'dark' : 'light' });
    },
    toggleFilter(key) {
      this.filters = { ...this.filters, [key]: !this.filters[key] };
      if (this.production) { this.page = 1; this.loadListPage(); }
    },
    applyRegex({ pattern }) {
      this.search = pattern;
      this.regexMode = true;
      this.regexPopoverOpen = false;
      notificationCenter.notify({
        title: 'Regex applied',
        message: `Searching merge requests with /${pattern}/i`,
        severity: 'info',
        timeout: 3000,
      });
    },
    createMergeRequest() {
      if (this.production) {
        if (this.permissions.create === true && this.newMergeRequestPath) this.navigate(this.newMergeRequestPath);
        return;
      }
      this.$emit('create-merge-request');
      window.location.assign(`/${this.projectPath}/-/merge_requests/new`);
    },
    toggleSelect(id) {
      this.selectedIds = this.selectedIds.includes(id)
        ? this.selectedIds.filter((x) => x !== id)
        : [...this.selectedIds, id];
    },
    selectAll() {
      this.selectedIds = this.filteredMrs.map((mr) => mr.id);
    },
    selectNone() {
      this.selectedIds = [];
    },
    invertSelection() {
      const selected = new Set(this.selectedIds);
      this.selectedIds = this.filteredMrs.filter((mr) => !selected.has(mr.id)).map((mr) => mr.id);
    },
    requestCloseSelected() {
      const count = this.closeableSelectedCount;
      if (!count) return;
      this.confirmDialog = {
        open: true,
        title: 'Close selected merge requests?',
        message: `This closes ${count} open merge request${count === 1 ? '' : 's'} without merging their changes.`,
        confirmLabel: 'Close merge requests',
        action: this.closeSelectedMrs,
      };
    },
    runConfirmedAction() {
      const { action } = this.confirmDialog;
      this.confirmDialog = { ...this.confirmDialog, open: false };
      if (action) action();
    },
    async closeSelectedMrs() {
      if (this.production) {
        if (this.permissions.update !== true || this.mutationPending) return;
        this.mutationPending = true;
        const candidates = this.mrs.filter((mr) => this.selectedIds.includes(mr.id) && mr.state === 'Open');
        const results = await Promise.allSettled(candidates.map((mr) => this.listAdapter.close(mr.iid)));
        const accepted = results.filter((result) => result.status === 'fulfilled').map((result) => result.value);
        this.mrs = this.mrs.map((mr) => accepted.find((item) => item.id === mr.id) || mr);
        this.selectedIds = this.selectedIds.filter((id) => !accepted.some((mr) => mr.id === id));
        if (accepted.length) notificationCenter.notify({ title: 'Merge requests closed', message: `${accepted.length} merge requests closed.`, severity: 'success' });
        const rejected = results.find((result) => result.status === 'rejected');
        if (rejected) notificationCenter.notify({ title: 'Some merge requests were not closed', message: rejected.reason.message, severity: 'error' });
        this.mutationPending = false;
        return;
      }
      const ids = [...this.selectedIds];
      try {
        await Promise.all(ids.map((id) => {
          const mr = this.mrs.find((item) => item.id === id);
          return this.api.updateMergeRequest(mr.iid, { state_event: 'close' });
        }));
        this.mrs = closeMergeRequests(this.mrs, ids);
        this.selectedIds = [];
        notificationCenter.notify({ title: 'Merge requests closed', message: `${ids.length} merge request${ids.length === 1 ? '' : 's'} closed.`, severity: 'success' });
      } catch (error) {
        notificationCenter.notify({ title: 'Could not close merge requests', message: error.message, severity: 'error' });
      }
    },
    async onToggleApprove(mrId) {
      const current = this.mrs.find((mr) => mr.id === mrId);
      if (!current) return;
      try {
        await (current.approvedByMe ? this.api.unapproveMergeRequest(current.iid) : this.api.approveMergeRequest(current.iid));
        this.mrs = this.mrs.map((mr) => (mr.id === mrId ? toggleApproval(mr) : mr));
      } catch (error) {
        notificationCenter.notify({ title: 'Approval update failed', message: error.message, severity: 'error' });
        return;
      }
      const updated = this.mrs.find((mr) => mr.id === mrId);
      notificationCenter.notify({
        title: updated.approvedByMe ? 'Approved' : 'Approval removed',
        message: `!${updated.iid} ${updated.title}`,
        severity: 'success',
        timeout: 4000,
      });
    },
    async onMergeComplete(mrId) {
      const current = this.mrs.find((mr) => mr.id === mrId);
      if (!current) return;
      try {
        await this.api.mergeMergeRequest(current.iid, { should_remove_source_branch: false });
        this.mrs = this.mrs.map((mr) => (mr.id === mrId ? markMerged(mr) : mr));
      } catch (error) {
        notificationCenter.notify({ title: 'Merge failed', message: error.message, severity: 'error' });
        return;
      }
      const merged = this.mrs.find((mr) => mr.id === mrId);
      notificationCenter.notify({
        title: 'Merged',
        message: `!${merged.iid} ${merged.title} was merged into ${merged.target}.`,
        severity: 'success',
      });
    },
    async onAddComment({ mrId, text }) {
      const current = this.mrs.find((mr) => mr.id === mrId);
      if (!current || !String(text || '').trim()) return;
      try {
        await this.api.createMergeRequestNote(current.iid, text);
        this.mrs = this.mrs.map((mr) => (mr.id === mrId ? appendComment(mr, text, this.currentUser.name || 'Current user') : mr));
        notificationCenter.notify({ title: 'Comment added', message: 'Your comment was posted.', severity: 'success', timeout: 3000 });
      } catch (error) {
        notificationCenter.notify({ title: 'Comment failed', message: error.message, severity: 'error' });
      }
    },
    async onToggleResolve({ mrId, threadIndex }) {
      const current = this.mrs.find((mr) => mr.id === mrId);
      const thread = current?.threads?.[threadIndex];
      if (!current || !thread?.id) return;
      try {
        await this.api.resolveMergeRequestDiscussion(current.iid, thread.id, !thread.resolved);
        this.mrs = this.mrs.map((mr) => (mr.id === mrId ? toggleThreadResolved(mr, threadIndex) : mr));
      } catch (error) {
        notificationCenter.notify({ title: 'Discussion update failed', message: error.message, severity: 'error' });
      }
    },
    async openDetail(id) {
      if (this.production) {
        const current = this.mrs.find((mr) => mr.id === id);
        if (current?.webUrl) this.navigate(current.webUrl);
        else notificationCenter.notify({ title: 'Merge request link unavailable', message: 'Reload the list to retrieve its review link.', severity: 'error' });
        return;
      }
      this.detailId = id;
      const current = this.mrs.find((mr) => mr.id === id);
      if (!current) return;
      try {
        const detail = await fetchMergeRequestDetail({ projectPath: this.projectPath, iid: current.iid, client: this.api });
        this.mrs = this.mrs.map((mr) => (mr.id === id ? detail : mr));
      } catch (error) {
        notificationCenter.notify({ title: 'Merge request details unavailable', message: error.message, severity: 'error' });
      }
    },
  },
};
</script>

<style lang="scss" src="./mergerequests.scss"></style>
