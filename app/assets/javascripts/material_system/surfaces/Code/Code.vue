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

    <code-tabs :tabs="tabs" :active-tab="activeTab" :count-label="countLabel" @select="setActiveTab" />

    <main id="gl-code-tabpanel" class="gl-code-main" role="tabpanel" tabindex="0" :aria-label="`${activeTab} panel`">
      <compare-card
        v-if="activeTab === 'Compare'"
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
  DEFAULT_COMPARE_REFS,
  PIPELINE_STATUS_META,
  createMatcher,
  filterBranches,
  filterCommits,
  filterTags,
  filterSnippets,
  buildRegexCorpus,
  runCompareRequest,
  createCodeSeedState,
} from './data';
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
    userInitials: { type: String, default: 'JD' },
  },
  data() {
    return {
      entities: createCodeSeedState(),
      search: '',
      regexMode: false,
      regexOpen: false,
      paletteOpen: false,
      activeTab: 'Branches',
      compFrom: DEFAULT_COMPARE_REFS[0],
      compTo: DEFAULT_COMPARE_REFS[1],
      compResult: null,
      comparePending: false,
      selectedByTab: { Branches: [], Commits: [], Tags: [], Snippets: [] },
      confirmState: null,
      settings: loadSettings(),
      systemPrefersDark: typeof window !== 'undefined' && window.matchMedia
        ? window.matchMedia('(prefers-color-scheme: dark)').matches
        : false,
    };
  },
  computed: {
    tabs() { return CODE_TABS; },
    compareRefs() { return DEFAULT_COMPARE_REFS; },
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
      if (this.activeTab === 'Branches') return [{ id: 'delete', label: 'Delete selected', danger: true }];
      if (this.activeTab === 'Commits') return [{ id: 'copy-shas', label: 'Copy SHAs', danger: false }];
      if (this.activeTab === 'Tags') return [{ id: 'delete', label: 'Delete selected', danger: true }];
      if (this.activeTab === 'Snippets') return [{ id: 'delete', label: 'Delete selected', danger: true }];
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
        const { message } = await runCompareRequest(this.compFrom, this.compTo);
        this.compResult = message;
      } finally {
        this.comparePending = false;
      }
    },
    branchRow(branch) {
      return {
        id: branch.id,
        icon: 'account_tree',
        iconColor: 'var(--prim)',
        title: branch.name,
        titleMono: true,
        sub: branch.sub,
        badge: branch.badge,
        badgeBg: branch.badge === 'protected' ? 'var(--warnc)' : 'var(--primc)',
        badgeFg: branch.badge === 'protected' ? 'var(--warn)' : 'var(--onprimc)',
        meta: branch.when,
        actionLabel: branch.deletable ? 'Delete' : null,
        actionColor: 'var(--err)',
        onAction: branch.deletable ? () => this.confirmDeleteBranch(branch) : null,
      };
    },
    commitRow(commit) {
      const meta = PIPELINE_STATUS_META[commit.pipelineStatus];
      return {
        id: commit.id,
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
        icon: 'sell',
        iconColor: 'var(--prim)',
        title: tag.name,
        titleMono: true,
        sub: tag.sub,
        badge: null,
        badgeBg: null,
        badgeFg: null,
        meta: tag.when,
        actionLabel: 'Delete',
        actionColor: 'var(--err)',
        onAction: () => this.confirmDeleteTag(tag),
      };
    },
    snippetRow(snippet) {
      return {
        id: snippet.id,
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
    deleteBranch(id) {
      const branch = this.entities.branches.find((b) => b.id === id);
      this.entities.branches = this.entities.branches.filter((b) => b.id !== id);
      this.removeFromSelection('Branches', id);
      notificationCenter.notify({ title: 'Branch deleted', message: `${branch ? branch.name : id} was deleted.`, severity: 'success' });
    },
    confirmDeleteTag(tag) {
      this.confirmState = {
        title: `Delete tag ${tag.name}?`,
        body: `This permanently deletes the ${tag.name} tag. This action cannot be undone.`,
        onConfirm: () => this.deleteTag(tag.id),
      };
    },
    deleteTag(id) {
      const tag = this.entities.tags.find((t) => t.id === id);
      this.entities.tags = this.entities.tags.filter((t) => t.id !== id);
      this.removeFromSelection('Tags', id);
      notificationCenter.notify({ title: 'Tag deleted', message: `${tag ? tag.name : id} was deleted.`, severity: 'success' });
    },
    onBulkAction(actionId, ids) {
      if (!ids.length) return;
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
    bulkDeleteBranches(ids) {
      const deletable = ids.filter((id) => {
        const branch = this.entities.branches.find((b) => b.id === id);
        return branch && branch.deletable;
      });
      const skipped = ids.length - deletable.length;
      this.entities.branches = this.entities.branches.filter((b) => !deletable.includes(b.id));
      deletable.forEach((id) => this.removeFromSelection('Branches', id));
      notificationCenter.notify({
        title: 'Branches deleted',
        message: `${deletable.length} branch${deletable.length === 1 ? '' : 'es'} deleted.`
          + (skipped ? ` ${skipped} protected branch${skipped === 1 ? '' : 'es'} were skipped.` : ''),
        severity: 'success',
      });
    },
    bulkDeleteTags(ids) {
      this.entities.tags = this.entities.tags.filter((t) => !ids.includes(t.id));
      ids.forEach((id) => this.removeFromSelection('Tags', id));
      notificationCenter.notify({ title: 'Tags deleted', message: `${ids.length} tag${ids.length === 1 ? '' : 's'} deleted.`, severity: 'success' });
    },
    bulkDeleteSnippets(ids) {
      this.entities.snippets = this.entities.snippets.filter((sn) => !ids.includes(sn.id));
      ids.forEach((id) => this.removeFromSelection('Snippets', id));
      notificationCenter.notify({ title: 'Snippets deleted', message: `${ids.length} snippet${ids.length === 1 ? '' : 's'} deleted.`, severity: 'success' });
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
