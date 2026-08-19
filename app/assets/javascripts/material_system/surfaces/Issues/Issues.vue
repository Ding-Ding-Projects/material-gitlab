<template>
  <section class="gl-mds-issues" :data-theme="resolvedTheme">
    <surface-header :view="view" @update:view="setView" @open-new="openNew" />

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
    </div>

    <bulk-action-bar
      v-if="selectedIds.length"
      class="gl-mds-issues__bulkbar"
      :selected-count="selectedIds.length"
      :total-count="filteredIssues.length"
      @close-selected="bulkClose"
      @reopen-selected="bulkReopen"
      @delete-selected="requestBulkDelete"
      @clear="clearSelection"
    />

    <issue-list-view
      v-if="view === 'list' && !loading"
      :issues="visibleIssues"
      :selected-ids="selectedIds"
      @open="openDrawer"
      @toggle-select="toggleSelect"
      @select-all="selectAllVisible"
      @clear-selection="clearSelection"
    />

    <issue-board-view
      v-else-if="!loading"
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

    <issue-drawer
      v-if="drawerIssue"
      :issue="drawerIssue"
      :all-labels="allLabelChips"
      :assignees="assigneeChips"
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
import { loadSettings, subscribeSettings } from '../../settings';
import notificationCenter from '../../notifications';
import {
  COLUMN_DEFS,
  ASSIGNABLE_PEOPLE,
  ALL_LABELS,
  CURRENT_USER,
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
  components: {
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
  data() {
    return {
      loading: true,
      issues: [],
      view: 'list',
      search: '',
      regexMode: false,
      regexOpen: false,
      regexDraft: '',
      regexFlags: { i: true, g: true, m: false, s: false },
      regexTestText: 'auth: login failed for user 42\npipeline #8812 passed in 04:31\nERROR TokenRefresh retry_count=3',
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
        const mineOk = !mine || issue.assignee === CURRENT_USER;
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
      return ALL_LABELS.map((name) => {
        const on = this.drawerIssue.labels.includes(name);
        const token = labelToken(name);
        return { name, on, bg: token.bg, fg: token.fg };
      });
    },
    assigneeChips() {
      if (!this.drawerIssue) return [];
      return ASSIGNABLE_PEOPLE.map((person) => ({
        name: person,
        avatar: avatarInitials(person),
        on: this.drawerIssue.assignee === person,
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
    this._api = createIssuesApi();
    this.issues = await this._api.list();
    this.loading = false;
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
    },
    toggleRegexMode() {
      this.regexMode = !this.regexMode;
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
      const issue = await this._api.create({ title: this.newTitle, body: this.newBody, col: 'todo' });
      this.issues = [issue, ...this.issues];
      this.newOpen = false;
      this.newTitle = '';
      this.newBody = '';
      notificationCenter.notify({ message: `Issue #${issue.iid} “${issue.title}” created.`, severity: 'success' });
    },
    toggleFilter(key) {
      this.filters = { ...this.filters, [key]: !this.filters[key] };
    },
    openDrawer(id) {
      this.drawerId = id;
    },
    closeDrawer() {
      this.drawerId = null;
    },
    async applyPatch(id, patch) {
      const updated = await this._api.update(id, patch);
      if (updated) this.issues = this.issues.map((issue) => (issue.id === id ? updated : issue));
      return updated;
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
      await this.applyPatch(issue.id, { assignee: person });
    },
    async toggleDrawerState() {
      const issue = this.drawerIssue;
      if (!issue) return;
      const nextState = issue.state === 'Open' ? 'Closed' : 'Open';
      await this.applyPatch(issue.id, { state: nextState, col: nextState === 'Closed' ? 'done' : 'todo' });
      notificationCenter.notify({ message: `Issue #${issue.iid} ${nextState === 'Closed' ? 'closed' : 'reopened'}.`, severity: 'success' });
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
      const issue = await this._api.create({ title: this.columnDraft, col: colKey });
      this.issues = [...this.issues, issue];
      this.addingCol = null;
      this.columnDraft = '';
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
      await this.applyPatch(id, { col: colKey, state: colKey === 'done' ? 'Closed' : 'Open' });
      notificationCenter.notify({ message: `Moved to ${columnName}.`, severity: 'success', timeout: 3000 });
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
      await Promise.all(ids.map((id) => this.applyPatch(id, { state: 'Closed', col: 'done' })));
      notificationCenter.notify({ message: `${ids.length} issue${ids.length === 1 ? '' : 's'} closed.`, severity: 'success' });
    },
    async bulkReopen() {
      const ids = [...this.selectedIds];
      await Promise.all(ids.map((id) => this.applyPatch(id, { state: 'Open', col: 'todo' })));
      notificationCenter.notify({ message: `${ids.length} issue${ids.length === 1 ? '' : 's'} reopened.`, severity: 'success' });
    },
    requestBulkDelete() {
      this.confirmDelete = true;
    },
    cancelBulkDelete() {
      this.confirmDelete = false;
    },
    async performBulkDelete() {
      const ids = [...this.selectedIds];
      await this._api.remove(ids);
      this.issues = this.issues.filter((issue) => !ids.includes(issue.id));
      this.selectedIds = [];
      this.confirmDelete = false;
      notificationCenter.notify({ message: `${ids.length} issue${ids.length === 1 ? '' : 's'} deleted.`, severity: 'success' });
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
</style>
