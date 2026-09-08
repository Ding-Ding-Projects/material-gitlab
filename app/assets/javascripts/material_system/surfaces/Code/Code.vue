<template>
  <div class="gl-material-code" :data-theme="isDark ? 'dark' : 'light'">
    <code-top-bar
      :search="search"
      :regex-mode="regexMode"
      :search-placeholder="searchPlaceholder"
      :is-dark="isDark"
      :user-initials="userInitials"
      @update:search="setSearch"
      @toggle-regex-mode="toggleRegexMode"
      @open-regex-builder="openRegexBuilder"
      @open-palette="openPalette"
      @toggle-theme="toggleTheme"
    />

    <h1>Code</h1>
    <a v-if="managementPath" :href="managementPath">Create {{ activeTab === 'Branches' ? 'branch' : activeTab === 'Tags' ? 'tag' : 'snippet' }}</a>
    <a v-if="routes.branchRules" :href="routes.branchRules">Branch rules</a>
    <code-tabs :tabs="tabs" :active-tab="activeTab" :count-label="countLabel" @select="setActiveTab" />

    <main id="gl-code-tabpanel" class="gl-code-main" role="tabpanel" tabindex="0" :aria-label="`${activeTab} panel`">
      <p v-if="loading" role="status">Loading live Code data...</p>
      <p v-else-if="loadError" role="alert">{{ loadError }} <button type="button" @click="load">Retry</button></p>
      <compare-card
        v-else-if="activeTab === 'Compare'"
        :refs="compareRefs"
        :from-ref="compFrom"
        :to-ref="compTo"
        :result="compResult"
        @update:from-ref="setCompFrom"
        @update:to-ref="setCompTo"
        @compare="runCompare"
      />
      <code-row-list
        v-else
        :rows="rows"
        :selected-ids="selectedIds"
        :entity-label-plural="entityLabelPlural"
        empty-message="Nothing matches."
        :bulk-actions="bulkActionsForTab"
        @update:selected-ids="updateSelection"
        @bulk-action="onBulkAction"
      />
    </main>

    <regex-builder-popover
      v-if="regexOpen"
      :initial="regexMode ? search : ''"
      :corpus="regexCorpus"
      corpus-title="Matches"
      @apply="applyRegex"
      @close="closeRegexBuilder"
    />
    <command-palette v-if="paletteOpen" :actions="paletteActions" @close="closePalette" />
    <confirm-dialog
      v-if="confirmState"
      :title="confirmState.title"
      :body="confirmState.body"
      @confirm="handleConfirm"
      @cancel="confirmState = null"
    />
  </div>
</template>

<script>
import { loadSettings, updateSettings, subscribeSettings } from '../../settings';
import { notificationCenter } from '../../notifications';
import {
  CODE_TABS,
  PIPELINE_STATUS_META,
  createMatcher,
  filterBranches,
  filterCommits,
  filterTags,
  filterSnippets,
  buildRegexCorpus,
  fetchBranches,
  fetchCommits,
  fetchTags,
  fetchSnippets,
  runCompareRequest,
  createCodeState,
} from './data';
import { createCodeClient, deleteCodeEntities } from './data';
import CodeTopBar from './components/CodeTopBar.vue';
import CodeTabs from './components/CodeTabs.vue';
import CompareCard from './components/CompareCard.vue';
import CodeRowList from './components/CodeRowList.vue';
import RegexBuilderPopover from './components/RegexBuilderPopover.vue';
import CommandPalette from './components/CommandPalette.vue';
import ConfirmDialog from './components/ConfirmDialog.vue';

const TAB_ICONS = {
  Branches: 'account_tree',
  Commits: 'commit',
  Tags: 'sell',
  Compare: 'arrow_forward',
  Snippets: 'sticky_note_2',
};

export default {
  name: 'CodeSurface',
  components: {
    CodeTopBar,
    CodeTabs,
    CompareCard,
    CodeRowList,
    RegexBuilderPopover,
    CommandPalette,
    ConfirmDialog,
  },
  props: {
    userInitials: { type: String, default: '' },
    projectPath: { type: String, required: true },
    projectUrl: { type: String, default: '' },
    initialTab: { type: String, default: 'Branches' },
    initialRef: { type: String, default: '' },
    initialPath: { type: String, default: '' },
    permissions: { type: Object, default: () => ({}) },
    routes: { type: Object, default: () => ({}) },
  },
  data() {
    return {
      entities: createCodeState(),
      search: '',
      regexMode: false,
      regexOpen: false,
      paletteOpen: false,
      activeTab: CODE_TABS.includes(this.initialTab) ? this.initialTab : 'Branches',
      compFrom: '',
      compTo: '',
      compResult: null,
      comparePending: false,
      selectedByTab: { Branches: [], Commits: [], Tags: [], Snippets: [] },
      confirmState: null,
      loadError: null,
      loading: true,
      mutationPending: false,
      settings: loadSettings(),
      systemPrefersDark: typeof window !== 'undefined' && window.matchMedia
        ? window.matchMedia('(prefers-color-scheme: dark)').matches
        : false,
    };
  },
  computed: {
    tabs() { return CODE_TABS.filter((tab) => tab !== 'Snippets' || this.permissions.readSnippets); },
    managementPath() { return this.routes[this.activeTab]; },
    compareRefs() { return [...new Set(this.entities.branches.map((branch) => branch.name))]; },
    isDark() {
      if (this.settings.theme === 'dark') return true;
      if (this.settings.theme === 'light') return false;
      return this.systemPrefersDark;
    },
    matcherFn() { return createMatcher(this.search, this.regexMode); },
    filteredBranches() { return filterBranches(this.entities.branches, this.matcherFn); },
    filteredCommits() { return filterCommits(this.entities.commits, this.matcherFn); },
    filteredTags() { return filterTags(this.entities.tags, this.matcherFn); },
    filteredSnippets() { return filterSnippets(this.entities.snippets, this.matcherFn); },
    rows() {
      if (this.activeTab === 'Branches') return this.filteredBranches.map(this.branchRow);
      if (this.activeTab === 'Commits') return this.filteredCommits.map(this.commitRow);
      if (this.activeTab === 'Tags') return this.filteredTags.map(this.tagRow);
      if (this.activeTab === 'Snippets') return this.filteredSnippets.map(this.snippetRow);
      return [];
    },
    entityLabelPlural() { return this.activeTab.toLowerCase(); },
    countLabel() {
      return this.activeTab === 'Compare' ? '' : `${this.rows.length} ${this.entityLabelPlural}`;
    },
    searchPlaceholder() {
      const scope = this.activeTab.toLowerCase();
      return this.regexMode ? `Regex search — ${scope}` : `Search ${scope}`;
    },
    regexCorpus() { return buildRegexCorpus(this.entities); },
    selectedIds() { return this.selectedByTab[this.activeTab] || []; },
    bulkActionsForTab() {
      if (this.mutationPending) return [];
      if (this.activeTab === 'Branches' && this.permissions.Branches) return [{ id: 'delete', label: 'Delete selected', danger: true }];
      if (this.activeTab === 'Commits') return [{ id: 'copy-shas', label: 'Copy SHAs', danger: false }];
      if (this.activeTab === 'Tags' && this.permissions.Tags) return [{ id: 'delete', label: 'Delete selected', danger: true }];
      if (this.activeTab === 'Snippets' && this.permissions.Snippets) return [{ id: 'delete', label: 'Delete selected', danger: true }];
      return [];
    },
    paletteActions() {
      return [
        { label: 'Toggle dark theme', icon: 'dark_mode', run: () => this.toggleTheme() },
        ...this.tabs.map((tab) => ({ label: `Code: ${tab}`, icon: TAB_ICONS[tab], run: () => this.setActiveTab(tab) })),
      ];
    },
  },
  mounted() {
    this.api = createCodeClient(this.projectPath);
    this.load();
    this._onKeydown = (event) => {
      if (event.ctrlKey && event.shiftKey && (event.key === 'F' || event.key === 'f')) {
        event.preventDefault();
        this.paletteOpen = true;
      } else if (event.key === 'Escape' && (this.paletteOpen || this.regexOpen)) {
        this.paletteOpen = false;
        this.regexOpen = false;
      }
    };
    window.addEventListener('keydown', this._onKeydown);

    this._unsubscribeSettings = subscribeSettings((next) => { this.settings = next; });

    if (window.matchMedia) {
      this._media = window.matchMedia('(prefers-color-scheme: dark)');
      this._onMediaChange = (event) => { this.systemPrefersDark = event.matches; };
      if (this._media.addEventListener) this._media.addEventListener('change', this._onMediaChange);
      else if (this._media.addListener) this._media.addListener(this._onMediaChange);
    }
  },
  beforeDestroy() {
    window.removeEventListener('keydown', this._onKeydown);
    if (this._unsubscribeSettings) this._unsubscribeSettings();
    if (this._media) {
      if (this._media.removeEventListener) this._media.removeEventListener('change', this._onMediaChange);
      else if (this._media.removeListener) this._media.removeListener(this._onMediaChange);
    }
  },
  methods: {
    async load() {
      this.loading = true; this.loadError = null;
      try {
        const [branches, commits, tags, snippets] = await Promise.all([
          fetchBranches({ projectPath: this.projectPath, client: this.api }),
          fetchCommits({ projectPath: this.projectPath, client: this.api, params: { ref_name: this.initialRef || undefined, path: this.initialPath || undefined } }),
          fetchTags({ projectPath: this.projectPath, client: this.api }),
          this.permissions.readSnippets ? fetchSnippets({ projectPath: this.projectPath, client: this.api }) : [],
        ]);
        this.entities = { branches, commits, tags, snippets };
        this.compFrom = this.compFrom || branches[0]?.name || '';
        this.compTo = this.compTo || branches[1]?.name || branches[0]?.name || '';
      } catch (error) { this.loadError = error.message; }
      finally { this.loading = false; }
    },
    setSearch(value) { this.search = value; },
    toggleRegexMode() { this.regexMode = !this.regexMode; },
    openRegexBuilder() { this.regexOpen = true; },
    closeRegexBuilder() { this.regexOpen = false; },
    applyRegex(pattern) {
      this.search = pattern;
      this.regexMode = true;
      this.regexOpen = false;
    },
    openPalette() { this.paletteOpen = true; },
    closePalette() { this.paletteOpen = false; },
    toggleTheme() {
      const next = this.isDark ? 'light' : 'dark';
      const result = updateSettings({ theme: next });
      if (result.ok) this.settings = result.value;
    },
    setActiveTab(tab) { this.activeTab = tab; },
    setCompFrom(value) { this.compFrom = value; this.compResult = null; },
    setCompTo(value) { this.compTo = value; this.compResult = null; },
    async runCompare() {
      this.comparePending = true;
      try {
        const { message } = await runCompareRequest(this.projectPath, this.compFrom, this.compTo, this.api);
        this.compResult = message;
      } catch (error) { this.compResult = error.message; } finally {
        this.comparePending = false;
      }
    },
    branchRow(branch) {
      return {
        id: branch.id,
        href: branch.webUrl || `${this.projectUrl}/-/tree/${encodeURIComponent(branch.name)}`,
        icon: 'account_tree',
        iconColor: 'var(--prim)',
        title: branch.name,
        titleMono: true,
        sub: branch.sub,
        badge: branch.badge,
        badgeBg: branch.badge === 'protected' ? 'var(--warnc)' : 'var(--primc)',
        badgeFg: branch.badge === 'protected' ? 'var(--warn)' : 'var(--onprimc)',
        meta: branch.when,
        actionLabel: branch.deletable && this.permissions.Branches && !this.mutationPending ? 'Delete' : null,
        actionColor: 'var(--err)',
        onAction: branch.deletable ? () => this.confirmDeleteBranch(branch) : null,
      };
    },
    commitRow(commit) {
      const meta = PIPELINE_STATUS_META[commit.pipelineStatus] || {};
      return {
        id: commit.id,
        href: commit.webUrl || `${this.projectUrl}/-/commit/${encodeURIComponent(commit.id)}`,
        icon: 'commit',
        iconColor: 'var(--onsurfv)',
        title: commit.message,
        titleMono: false,
        sub: `${commit.sha} · ${commit.author}`,
        badge: meta.label,
        badgeBg: meta.containerColor,
        badgeFg: meta.color,
        meta: commit.when,
        actionLabel: null,
        actionColor: null,
        onAction: null,
      };
    },
    tagRow(tag) {
      return {
        id: tag.id,
        href: `${this.projectUrl}/-/tags/${encodeURIComponent(tag.name)}`,
        icon: 'sell',
        iconColor: 'var(--prim)',
        title: tag.name,
        titleMono: true,
        sub: tag.sub,
        badge: null,
        badgeBg: null,
        badgeFg: null,
        meta: tag.when,
        actionLabel: tag.deletable && this.permissions.Tags && !this.mutationPending ? 'Delete' : null,
        actionColor: 'var(--err)',
        onAction: () => this.confirmDeleteTag(tag),
      };
    },
    snippetRow(snippet) {
      return {
        id: snippet.id,
        href: snippet.webUrl,
        icon: 'sticky_note_2',
        iconColor: 'var(--prim)',
        title: snippet.name,
        titleMono: false,
        sub: snippet.sub,
        badge: snippet.visibility,
        badgeBg: 'var(--surfch)',
        badgeFg: 'var(--onsurfv)',
        meta: snippet.when,
        actionLabel: null,
        actionColor: null,
        onAction: null,
      };
    },
    updateSelection(ids) {
      this.$set(this.selectedByTab, this.activeTab, ids);
    },
    removeFromSelection(tab, id) {
      const current = this.selectedByTab[tab] || [];
      this.$set(this.selectedByTab, tab, current.filter((x) => x !== id));
    },
    confirmDeleteBranch(branch) {
      this.confirmState = {
        title: `Delete branch ${branch.name}?`,
        body: `This permanently deletes the ${branch.name} branch. This action cannot be undone.`,
        onConfirm: () => this.deleteBranch(branch.id),
      };
    },
    deleteBranch(id) { return this.bulkDeleteBranches([id]); },
    confirmDeleteTag(tag) {
      this.confirmState = {
        title: `Delete tag ${tag.name}?`,
        body: `This permanently deletes the ${tag.name} tag. This action cannot be undone.`,
        onConfirm: () => this.deleteTag(tag.id),
      };
    },
    deleteTag(id) { return this.bulkDeleteTags([id]); },
    onBulkAction(actionId, ids) {
      if (!ids.length || this.mutationPending) return;
      if (this.activeTab === 'Branches' && actionId === 'delete') {
        const deletableCount = ids.filter((id) => {
          const branch = this.entities.branches.find((b) => b.id === id);
          return branch && branch.deletable;
        }).length;
        const skipped = ids.length - deletableCount;
        this.confirmState = {
          title: `Delete ${deletableCount} branch${deletableCount === 1 ? '' : 'es'}?`,
          body: `This permanently deletes ${deletableCount} branch${deletableCount === 1 ? '' : 'es'}.`
            + (skipped ? ` ${skipped} protected branch${skipped === 1 ? '' : 'es'} in the selection will be skipped.` : '')
            + ' This action cannot be undone.',
          onConfirm: () => this.bulkDeleteBranches(ids),
        };
      } else if (this.activeTab === 'Tags' && actionId === 'delete') {
        this.confirmState = {
          title: `Delete ${ids.length} tag${ids.length === 1 ? '' : 's'}?`,
          body: `This permanently deletes ${ids.length} tag${ids.length === 1 ? '' : 's'}. This action cannot be undone.`,
          onConfirm: () => this.bulkDeleteTags(ids),
        };
      } else if (this.activeTab === 'Snippets' && actionId === 'delete') {
        this.confirmState = {
          title: `Delete ${ids.length} snippet${ids.length === 1 ? '' : 's'}?`,
          body: `This permanently deletes ${ids.length} snippet${ids.length === 1 ? '' : 's'}. This action cannot be undone.`,
          onConfirm: () => this.bulkDeleteSnippets(ids),
        };
      } else if (this.activeTab === 'Commits' && actionId === 'copy-shas') {
        this.copyCommitShas(ids);
      }
    },
    bulkDeleteBranches(ids) { return this.deleteEntities('Branches', 'branches', ids, (entity) => this.api.deleteBranch(entity.name)); },
    bulkDeleteTags(ids) { return this.deleteEntities('Tags', 'tags', ids, (entity) => this.api.deleteTag(entity.name)); },
    bulkDeleteSnippets(ids) { return this.deleteEntities('Snippets', 'snippets', ids, (entity) => this.api.deleteSnippet(entity.id)); },
    async deleteEntities(tab, key, ids, operation) {
      if (!this.permissions[tab] || this.mutationPending) return;
      this.mutationPending = true;
      try {
        const result = await deleteCodeEntities({ entities: this.entities[key], ids, operation, canDelete: (entity) => !entity.protected && !entity.default });
        this.entities[key] = this.entities[key].filter((entity) => !result.deleted.includes(entity.id));
        result.deleted.forEach((id) => this.removeFromSelection(tab, id));
        if (result.deleted.length) notificationCenter.notify({ title: 'Deletion completed', message: `${result.deleted.length} selected ${tab.toLowerCase()} deleted by the server.`, severity: 'success' });
        if (result.failed.length || result.skipped.length) notificationCenter.notify({ title: 'Some selections were retained', message: [...result.failed.map((item) => `${item.id}: ${item.message}`), ...(result.skipped.length ? [`${result.skipped.length} protected, default or unavailable items skipped.`] : [])].join(' '), severity: 'error' });
        return result;
      } finally { this.mutationPending = false; }
    },
    async copyCommitShas(ids) {
      const shas = this.entities.commits.filter((c) => ids.includes(c.id)).map((c) => c.sha);
      const text = shas.join('\n');
      try {
        if (!navigator.clipboard || !navigator.clipboard.writeText) throw new Error('Clipboard API unavailable');
        await navigator.clipboard.writeText(text);
        notificationCenter.notify({ title: 'Copied', message: `${shas.length} commit SHA${shas.length === 1 ? '' : 's'} copied to the clipboard.`, severity: 'success' });
      } catch (error) {
        notificationCenter.notify({ title: 'Copy failed', message: `Could not copy to the clipboard: ${error.message}`, severity: 'error' });
      }
    },
    handleConfirm() {
      if (this.confirmState) this.confirmState.onConfirm();
      this.confirmState = null;
    },
  },
};
</script>

<style lang="scss">
@import './code.scss';
</style>
