<template>
  <section class="gl-mds-issues" :data-theme="resolvedTheme" data-material-topbar-owner="surface.issues">
    <surface-header :view="view" :can-create="!production || permissions.create === true" :new-issue-path="newIssuePath" :board-path="boardPath" @update:view="setView" @open-new="openNew" />
    <gl-link v-if="workItemsPath" :href="workItemsPath" class="gl-mds-issues__row">Open all work item types and advanced filters</gl-link>

    <div class="gl-mds-issues__row gl-mds-issues__row--search">
      <issue-search-bar
        :search="search"
        :regex-mode="regexMode"
        :regex-error="regexSearchError"
        @update:search="setSearch"
        @toggle-regex-mode="toggleRegexMode"
        @open-regex-builder="openRegexBuilder"
      />
    </div>

    <div class="gl-mds-issues__row gl-mds-issues__row--filter">
      <filter-bar :filters="filters" :count="filteredIssues.length" @toggle-filter="toggleFilter" />
      <p v-if="regexMode">Regular expressions filter the current page.</p>
    </div>

    <bulk-action-bar
      v-if="selectedIds.length"
      class="gl-mds-issues__bulkbar"
      :selected-count="selectedIds.length"
      :total-count="filteredIssues.length"
      :can-update="!production || permissions.update === true"
      :can-delete="!production || permissions.delete === true"
      @close-selected="bulkClose"
      @reopen-selected="bulkReopen"
      @delete-selected="requestBulkDelete"
      @clear="clearSelection"
    />

    <issue-list-view
      v-if="view === 'list' && !loading && !loadError"
      :issues="visibleIssues"
      :selected-ids="selectedIds"
      @open="openDrawer"
      @toggle-select="toggleSelect"
      @select-all="selectAllVisible"
      @clear-selection="clearSelection"
    />

    <issue-board-view
      v-else-if="!loading && !loadError"
      :columns="columns"
      :adding-col="addingCol"
      :draft="columnDraft"
      @drop="onDrop"
      @open="openDrawer"
      @drag-start="onDragStart"
      @move="onCardMove"
      @start-add="startAdd"
      @cancel-add="cancelAdd"
      @update-draft="setColumnDraft"
      @confirm-add="confirmAddCard"
    />

    <div v-if="loading" class="gl-mds-issues__loading" role="status">Loading issues…</div>

    <div v-else-if="loadError" class="gl-mds-issues__error" role="alert">
      <strong>Issues could not be loaded.</strong>
      <span>{{ loadError }}</span>
      <material-button variant="text" type="button" @click="loadPage">Retry</material-button>
    </div>

    <nav v-if="!loading && !loadError && (page > 1 || hasNextPage)" class="gl-mds-issues__pagination" aria-label="Issue pages">
      <material-button variant="text" type="button" :disabled="page <= 1" @click="previousPage">Previous</material-button>
      <span>Page {{ page }}<template v-if="totalPages"> of {{ totalPages }}</template></span>
      <material-button variant="text" type="button" :disabled="!hasNextPage" @click="nextPage">Next</material-button>
    </nav>

    <issue-drawer
      v-if="drawerIssue"
      :issue="drawerIssue"
      :all-labels="allLabelChips"
      :assignees="assigneeChips"
      :can-update="!production || permissions.update === true"
      @close="closeDrawer"
      @toggle-label="toggleDrawerLabel"
      @pick-assignee="pickAssignee"
      @toggle-state="toggleDrawerState"
    />

    <new-issue-dialog
      v-if="newOpen"
      :title-value="newTitle"
      :body-value="newBody"
      @update:title="setNewTitle"
      @update:body="setNewBody"
      @cancel="closeNew"
      @create="createIssue"
    />

    <regex-builder-dialog
      v-if="regexOpen"
      :draft="regexDraft"
      :flags="regexFlags"
      :test-text="regexTestText"
      :evaluation="regexEvaluation"
      :snippet-groups="snippetGroups"
      :flag-info="flagInfo"
      @update:draft="setRegexDraft"
      @toggle-flag="toggleRegexFlag"
      @update:test-text="setRegexTestText"
      @insert-snippet="insertSnippet"
      @close="closeRegexBuilder"
      @apply="applyRegex"
    />

    <confirm-dialog
      v-if="confirmDelete"
      title="Delete issues?"
      :message="deleteConfirmMessage"
      confirm-label="Delete"
      @cancel="cancelBulkDelete"
      @confirm="performBulkDelete"
    />

    <notification-stack />
  </section>
</template>

<script>
import MaterialButton from '~/material_system/components/material_button';

import { GlLink } from '@gitlab/ui';
import { loadSettings, subscribeSettings } from '../../settings';
import notificationCenter from '../../notifications';
import {
  COLUMN_DEFS,
  currentUser,
  labelToken,
  avatarInitials,
  createIssuesApi,
} from './data';
import { issueMatcher, issueSearchText, evaluateRegexDraft, SNIPPET_GROUPS, REGEX_FLAG_INFO } from './regexIssueSearch';

import SurfaceHeader from './components/SurfaceHeader.vue';
import IssueSearchBar from './components/IssueSearchBar.vue';
import FilterBar from './components/FilterBar.vue';
import BulkActionBar from './components/BulkActionBar.vue';
import IssueListView from './components/IssueListView.vue';
import IssueBoardView from './components/IssueBoardView.vue';
import IssueDrawer from './components/IssueDrawer.vue';
import NewIssueDialog from './components/NewIssueDialog.vue';
import RegexBuilderDialog from './components/RegexBuilderDialog.vue';
import ConfirmDialog from './components/ConfirmDialog.vue';
import NotificationStack from './components/NotificationStack.vue';

export default {
  name: 'IssuesSurface',
  components: { MaterialButton,
    GlLink,
    SurfaceHeader,
    IssueSearchBar,
    FilterBar,
    BulkActionBar,
    IssueListView,
    IssueBoardView,
    IssueDrawer,
    NewIssueDialog,
    RegexBuilderDialog,
    ConfirmDialog,
    NotificationStack,
  },
  props: {
    projectId: { type: [String, Number], default: null },
    apiAdapter: { type: Object, default: null },
    production: { type: Boolean, default: false },
    permissions: { type: Object, default: () => ({}) },
    user: { type: Object, default: null },
    newIssuePath: { type: String, default: '' },
    boardPath: { type: String, default: '' },
    workItemsPath: { type: String, default: '' },
  },
  data() {
    return {
      loading: true,
      loadError: '',
      issues: [],
      view: 'list',
      page: 1,
      totalPages: 1,
      hasNextPage: false,
      perPage: 20,
      search: '',
      regexMode: false,
      regexOpen: false,
      regexDraft: '',
      regexFlags: { i: true, g: true, m: false, s: false },
      regexTestText: '',
      newOpen: false,
      newTitle: '',
      newBody: '',
      drawerId: null,
      dragId: null,
      filters: { open: true, closed: false, mine: false },
      addingCol: null,
      columnDraft: '',
      selectedIds: [],
      confirmDelete: false,
      settings: loadSettings(),
      systemPrefersDark: false,
      snippetGroups: SNIPPET_GROUPS,
      flagInfo: REGEX_FLAG_INFO,
    };
  },
  computed: {
    resolvedTheme() {
      if (this.settings.theme === 'dark') return 'dark';
      if (this.settings.theme === 'light') return 'light';
      return this.systemPrefersDark ? 'dark' : 'light';
    },
    searchMatcher() {
      return issueMatcher(this.search, this.regexMode);
    },
    regexSearchError() {
      return this.regexMode && !!this.search && this.searchMatcher.error;
    },
    filteredIssues() {
      const { open, closed, mine } = this.filters;
      return this.issues.filter((issue) => {
        const stateOk = (open && issue.state === 'Open') || (closed && issue.state === 'Closed') || (!open && !closed);
        const user = this.user || currentUser();
        const mineOk = !mine || (user && (issue.assigneeId === user.id || issue.assignee === user.name || issue.assignee === user.username));
        return stateOk && mineOk && this.searchMatcher.test(issueSearchText(issue));
      });
    },
    visibleIssues() {
      return this.filteredIssues.map((issue) => ({
        ...issue,
        meta: issue.state === 'Open' ? `opened ${issue.opened} · ${issue.assignee}` : `closed · ${issue.assignee}`,
        stateColor: issue.state === 'Open' ? 'var(--gl-mds-good)' : 'var(--gl-mds-onsurfv)',
        avatar: avatarInitials(issue.assignee),
      }));
    },
    columns() {
      return COLUMN_DEFS.map((def) => ({
        ...def,
        cards: this.filteredIssues
          .filter((issue) => issue.col === def.key)
          .map((issue) => ({ ...issue, avatar: avatarInitials(issue.assignee) })),
      }));
    },
    drawerIssue() {
      const issue = this.issues.find((entry) => entry.id === this.drawerId);
      return issue || null;
    },
    allLabelChips() {
      if (!this.drawerIssue) return [];
      const labels = [...new Set(this.issues.flatMap((issue) => issue.labels || []))].sort();
      return labels.map((name) => {
        const on = this.drawerIssue.labels.includes(name);
        const token = labelToken(name);
        return { name, on, bg: token.bg, fg: token.fg };
      });
    },
    assigneeChips() {
      if (!this.drawerIssue) return [];
      const people = this.issues
        .flatMap((issue) => issue.assignees || [])
        .filter((person) => person.name)
        .reduce((all, person) => (all.some((entry) => entry.id === person.id) ? all : [...all, person]), []);
      return people.map((person) => ({
        ...person,
        avatar: avatarInitials(person.name),
        on: this.drawerIssue.assigneeId === person.id || this.drawerIssue.assignee === person.name,
      }));
    },
    regexEvaluation() {
      return evaluateRegexDraft({
        pattern: this.regexDraft,
        flags: this.regexFlags,
        testText: this.regexTestText,
        issues: this.issues,
      });
    },
    deleteConfirmMessage() {
      const count = this.selectedIds.length;
      return `${count} issue${count === 1 ? '' : 's'} will be permanently deleted. This cannot be undone.`;
    },
  },
  async created() {
    try {
      this._api = createIssuesApi({ projectId: this.projectId, adapter: this.apiAdapter, permissions: this.permissions });
      await this.loadPage();
    } catch (error) {
      this.loadError = error.message;
      this.loading = false;
    }
  },
  mounted() {
    this._unsubscribeSettings = subscribeSettings((next) => {
      this.settings = next;
    });
    if (window.matchMedia) {
      this._mq = window.matchMedia('(prefers-color-scheme: dark)');
      this.systemPrefersDark = this._mq.matches;
      this._mqListener = (event) => {
        this.systemPrefersDark = event.matches;
      };
      if (this._mq.addEventListener) this._mq.addEventListener('change', this._mqListener);
      else this._mq.addListener(this._mqListener);
    }
    this._onKeydown = (event) => {
      if (event.key !== 'Escape') return;
      if (this.confirmDelete) this.confirmDelete = false;
      else if (this.regexOpen) this.regexOpen = false;
      else if (this.newOpen) this.newOpen = false;
      else if (this.drawerId !== null) this.drawerId = null;
    };
    window.addEventListener('keydown', this._onKeydown);
  },
  beforeDestroy() {
    clearTimeout(this.searchTimer);
    this.loadGeneration = (this.loadGeneration || 0) + 1;
    if (this._unsubscribeSettings) this._unsubscribeSettings();
    if (this._mq) {
      if (this._mq.removeEventListener) this._mq.removeEventListener('change', this._mqListener);
      else this._mq.removeListener(this._mqListener);
    }
    window.removeEventListener('keydown', this._onKeydown);
  },
  methods: {
    setSearch(value) {
      this.search = value;
      this.page = 1;
      clearTimeout(this.searchTimer);
      this.searchTimer = setTimeout(() => this.loadPage(), 250);
    },
    toggleRegexMode() {
      this.regexMode = !this.regexMode;
      this.page = 1;
      this.loadPage();
    },
    openRegexBuilder() {
      this.regexDraft = this.regexMode ? this.search : '';
      this.regexOpen = true;
    },
    closeRegexBuilder() {
      this.regexOpen = false;
    },
    setRegexDraft(value) {
      this.regexDraft = value;
    },
    toggleRegexFlag(name) {
      this.regexFlags = { ...this.regexFlags, [name]: !this.regexFlags[name] };
    },
    setRegexTestText(value) {
      this.regexTestText = value;
    },
    insertSnippet(text) {
      this.regexDraft += text.replace(/ /g, '');
    },
    applyRegex() {
      this.search = this.regexDraft;
      this.regexMode = true;
      this.regexOpen = false;
    },
    setView(view) {
      this.view = view;
    },
    openNew() {
      this.newOpen = true;
    },
    closeNew() {
      this.newOpen = false;
    },
    setNewTitle(value) {
      this.newTitle = value;
    },
    setNewBody(value) {
      this.newBody = value;
    },
    async createIssue() {
      if (!this.newTitle.trim()) return;
      try {
        const issue = await this._api.create({ title: this.newTitle, body: this.newBody });
        await this.loadPage();
        this.newOpen = false;
        this.newTitle = '';
        this.newBody = '';
        notificationCenter.notify({ message: `Issue #${issue.iid} “${issue.title}” created.`, severity: 'success' });
      } catch (error) {
        this.notifyApiError(error, 'create this issue');
      }
    },
    toggleFilter(key) {
      this.filters = { ...this.filters, [key]: !this.filters[key] };
      this.page = 1;
      this.loadPage();
    },
    openDrawer(id) {
      this.drawerId = id;
    },
    closeDrawer() {
      this.drawerId = null;
    },
    async applyPatch(id, patch) {
      try {
        const updated = await this._api.update(id, patch);
        if (updated) this.issues = this.issues.map((issue) => (issue.id === id ? updated : issue));
        return updated;
      } catch (error) {
        this.notifyApiError(error, 'update this issue');
        return null;
      }
    },
    async toggleDrawerLabel(label) {
      const issue = this.drawerIssue;
      if (!issue) return;
      const has = issue.labels.includes(label);
      await this.applyPatch(issue.id, {
        labels: has ? issue.labels.filter((entry) => entry !== label) : [...issue.labels, label],
      });
    },
    async pickAssignee(person) {
      const issue = this.drawerIssue;
      if (!issue) return;
      await this.applyPatch(issue.id, { assigneeId: person.id });
    },
    async toggleDrawerState() {
      const issue = this.drawerIssue;
      if (!issue) return;
      const nextState = issue.state === 'Open' ? 'Closed' : 'Open';
      const updated = await this.applyPatch(issue.id, { state: nextState, col: nextState === 'Closed' ? 'done' : 'todo' });
      if (updated) notificationCenter.notify({ message: `Issue #${issue.iid} ${nextState === 'Closed' ? 'closed' : 'reopened'}.`, severity: 'success' });
    },
    startAdd(colKey) {
      this.addingCol = colKey;
      this.columnDraft = '';
    },
    cancelAdd() {
      this.addingCol = null;
      this.columnDraft = '';
    },
    setColumnDraft(value) {
      this.columnDraft = value;
    },
    async confirmAddCard(colKey) {
      if (!this.columnDraft.trim()) return;
      try {
        const issue = await this._api.create({ title: this.columnDraft });
        this.issues = [...this.issues, issue];
        this.addingCol = null;
        this.columnDraft = '';
      } catch (error) {
        this.notifyApiError(error, 'create this issue');
      }
    },
    onDragStart(id) {
      this.dragId = id;
    },
    async onDrop(colKey) {
      if (this.dragId === null) return;
      await this.moveToColumn(this.dragId, colKey);
      this.dragId = null;
    },
    async onCardMove({ id, col }) {
      await this.moveToColumn(id, col);
    },
    async moveToColumn(id, colKey) {
      const columnName = (COLUMN_DEFS.find((def) => def.key === colKey) || {}).name || colKey;
      try {
        const updated = this._api.moveToBoardList
          ? await this._api.moveToBoardList(id, colKey)
          : await this._api.update(id, { col: colKey, state: colKey === 'done' ? 'Closed' : 'Open' });
        if (updated) this.issues = this.issues.map((issue) => (issue.id === id ? updated : issue));
        notificationCenter.notify({ message: `Moved to ${columnName}.`, severity: 'success', timeout: 3000 });
      } catch (error) {
        this.notifyApiError(error, 'move this issue on the board');
      }
    },
    toggleSelect(id) {
      this.selectedIds = this.selectedIds.includes(id)
        ? this.selectedIds.filter((entry) => entry !== id)
        : [...this.selectedIds, id];
    },
    selectAllVisible() {
      this.selectedIds = this.filteredIssues.map((issue) => issue.id);
    },
    clearSelection() {
      this.selectedIds = [];
    },
    async bulkClose() {
      const ids = [...this.selectedIds];
      const results = await Promise.all(ids.map((id) => this.applyPatch(id, { state: 'Closed', col: 'done' })));
      const count = results.filter(Boolean).length;
      if (count) notificationCenter.notify({ message: `${count} issue${count === 1 ? '' : 's'} closed.`, severity: 'success' });
    },
    async bulkReopen() {
      const ids = [...this.selectedIds];
      const results = await Promise.all(ids.map((id) => this.applyPatch(id, { state: 'Open', col: 'todo' })));
      const count = results.filter(Boolean).length;
      if (count) notificationCenter.notify({ message: `${count} issue${count === 1 ? '' : 's'} reopened.`, severity: 'success' });
    },
    requestBulkDelete() {
      this.confirmDelete = true;
    },
    cancelBulkDelete() {
      this.confirmDelete = false;
    },
    async performBulkDelete() {
      const ids = [...this.selectedIds];
      try {
        await this._api.remove(ids);
        this.issues = this.issues.filter((issue) => !ids.includes(issue.id));
        this.selectedIds = [];
        this.confirmDelete = false;
        notificationCenter.notify({ message: `${ids.length} issue${ids.length === 1 ? '' : 's'} deleted.`, severity: 'success' });
      } catch (error) {
        await this.loadPage();
        this.notifyApiError(error, 'delete the selected issues');
      }
    },
    serverState() {
      if (this.filters.open && !this.filters.closed) return 'opened';
      if (this.filters.closed && !this.filters.open) return 'closed';
      return 'all';
    },
    async loadPage() {
      const generation = (this.loadGeneration || 0) + 1;
      this.loadGeneration = generation;
      this.loading = true;
      this.loadError = '';
      try {
        if (typeof this._api.listPage !== 'function') {
          this.issues = await this._api.list();
          this.totalPages = 1;
        } else {
          const result = await this._api.listPage({
            page: this.page,
            perPage: this.perPage,
            state: this.serverState(),
            scope: this.filters.mine ? 'assigned_to_me' : 'all',
            search: this.regexMode ? '' : this.search,
          });
          if (generation !== this.loadGeneration) return;
          this.issues = result.issues;
          this.totalPages = result.pagination.totalPages;
          this.hasNextPage = result.pagination.hasNextPage;
          this.selectedIds = this.selectedIds.filter((id) => this.issues.some((issue) => issue.id === id));
        }
      } catch (error) {
        if (generation === this.loadGeneration) this.loadError = error.message;
      } finally {
        if (generation === this.loadGeneration) this.loading = false;
      }
    },
    previousPage() {
      if (this.page > 1) {
        this.page -= 1;
        this.loadPage();
      }
    },
    nextPage() {
      if (this.hasNextPage) {
        this.page += 1;
        this.loadPage();
      }
    },
    notifyApiError(error, action) {
      const message = error?.status === 403 ? `You do not have permission to ${action}.` : error?.message || `Unable to ${action}.`;
      notificationCenter.notify({ title: 'Issue action failed', message, severity: 'error', persistent: true });
    },
  },
};
</script>

<style scoped lang="scss">
@import './issues.scss';

.gl-mds-issues {
  height: 100%;
}

.gl-mds-issues__row {
  padding: 6px 24px;

  &--search { padding-top: 4px; }
  &--filter { padding-bottom: 8px; }
}

.gl-mds-issues__bulkbar {
  margin-bottom: 10px;
}

.gl-mds-issues__loading {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--gl-mds-onsurfv);
  font-size: 13.5px;
}

.gl-mds-issues__error,
.gl-mds-issues__pagination {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 18px 24px;
  color: var(--gl-mds-onsurfv);
}

.gl-mds-issues__error {
  flex-direction: column;
  color: var(--gl-mds-err);
}

.gl-mds-issues__error button,
.gl-mds-issues__pagination button {
  border: 1px solid var(--gl-mds-outl);
  border-radius: 999px;
  background: var(--gl-mds-surf);
  color: var(--gl-mds-onsurf);
  padding: 8px 16px;
  cursor: pointer;
  font: inherit;
}

.gl-mds-issues__error button:focus-visible,
.gl-mds-issues__pagination button:focus-visible {
  outline: 2px solid var(--gl-mds-prim);
  outline-offset: 2px;
}

.gl-mds-issues__error button:disabled,
.gl-mds-issues__pagination button:disabled {
  cursor: not-allowed;
  opacity: 0.5;
}
</style>
