<template>
  <div class="mr-app" :data-theme="dark ? 'dark' : 'light'">
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
      <mr-list-header :count="filteredMrs.length" @create="createMergeRequest" />
      <mr-filter-chips :filters="filters" @toggle="toggleFilter" />
      <mr-bulk-action-bar
        v-if="selectedIds.length"
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
  matchesFilters,
  buildQueryMatcher,
  searchableText,
  toggleApproval,
  markMerged,
  appendComment,
  toggleThreadResolved,
  closeMergeRequests,
  CURRENT_USER_AVATAR_INITIALS,
  DEFAULT_FILTERS,
  FILTER_DEFS,
} from './data';
import notificationCenter from '~/material_system/notifications';
import { loadSettings, updateSettings } from '~/material_system/settings';

export default {
  name: 'MergeRequestsSurface',
  components: {
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
      avatarInitials: CURRENT_USER_AVATAR_INITIALS,
      avatarLabel: 'Signed in user',
      confirmDialog: { open: false, title: '', message: '', confirmLabel: 'Confirm', action: null },
    };
  },
  computed: {
    filteredMrs() {
      const matches = buildQueryMatcher(this.search, this.regexMode);
      return this.mrs.filter((mr) => matchesFilters(mr, this.filters) && matches(searchableText(mr)));
    },
    currentDetail() {
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
        actions.push({ label: 'New merge request', icon: 'add', run: this.createMergeRequest });
        FILTER_DEFS.forEach((def) => {
          actions.push({ label: `Toggle filter: ${def.label}`, icon: 'filter_alt', run: () => this.toggleFilter(def.key) });
        });
      }
      return actions;
    },
  },
  watch: {
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
    fetchMergeRequests().then((mrs) => {
      this.mrs = mrs;
      this.loading = false;
    });
    this.onKeydown = (event) => {
      if (event.ctrlKey && event.shiftKey && (event.key === 'F' || event.key === 'f')) {
        event.preventDefault();
        this.paletteOpen = true;
      }
    };
    window.addEventListener('keydown', this.onKeydown);
  },
  beforeDestroy() {
    window.removeEventListener('keydown', this.onKeydown);
  },
  methods: {
    toggleDark() {
      this.dark = !this.dark;
      updateSettings({ theme: this.dark ? 'dark' : 'light' });
    },
    toggleFilter(key) {
      this.filters = { ...this.filters, [key]: !this.filters[key] };
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
    openDetail(id) {
      this.detailId = id;
    },
    createMergeRequest() {
      this.$emit('create-merge-request');
      notificationCenter.notify({
        title: 'New merge request',
        message: 'Creating a merge request needs this surface connected to the GitLab API — not available in this preview build.',
        severity: 'info',
      });
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
    closeSelectedMrs() {
      const ids = [...this.selectedIds];
      this.mrs = closeMergeRequests(this.mrs, ids);
      this.selectedIds = [];
      notificationCenter.notify({
        title: 'Merge requests closed',
        message: `${ids.length} merge request${ids.length === 1 ? '' : 's'} closed.`,
        severity: 'success',
      });
    },
    onToggleApprove(mrId) {
      this.mrs = this.mrs.map((mr) => (mr.id === mrId ? toggleApproval(mr) : mr));
      const updated = this.mrs.find((mr) => mr.id === mrId);
      notificationCenter.notify({
        title: updated.approvedByMe ? 'Approved' : 'Approval removed',
        message: `!${updated.iid} ${updated.title}`,
        severity: 'success',
        timeout: 4000,
      });
    },
    onMergeComplete(mrId) {
      this.mrs = this.mrs.map((mr) => (mr.id === mrId ? markMerged(mr) : mr));
      const merged = this.mrs.find((mr) => mr.id === mrId);
      notificationCenter.notify({
        title: 'Merged',
        message: `!${merged.iid} ${merged.title} was merged into ${merged.target}.`,
        severity: 'success',
      });
    },
    onAddComment({ mrId, text }) {
      this.mrs = this.mrs.map((mr) => (mr.id === mrId ? appendComment(mr, text) : mr));
      notificationCenter.notify({ title: 'Comment added', message: 'Your comment was posted.', severity: 'success', timeout: 3000 });
    },
    onToggleResolve({ mrId, threadIndex }) {
      this.mrs = this.mrs.map((mr) => (mr.id === mrId ? toggleThreadResolved(mr, threadIndex) : mr));
    },
  },
};
</script>
