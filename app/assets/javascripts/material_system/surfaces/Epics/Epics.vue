<script>
import { __, sprintf, n__ } from '~/locale';
import { loadSettings, updateSettings, subscribeSettings } from '../../settings';
import notificationCenter from '../../notifications';
import { RegexBuilder } from '../../regex-builder';
import EpicsToolbar from './components/EpicsToolbar.vue';
import EpicsHeader from './components/EpicsHeader.vue';
import BulkActionBar from './components/BulkActionBar.vue';
import EpicTree from './components/EpicTree.vue';
import RoadmapView from './components/RoadmapView.vue';
import RegexBuilderPopover from './components/RegexBuilderPopover.vue';
import CommandPaletteOverlay from './components/CommandPaletteOverlay.vue';
import ConfirmDialog from './components/ConfirmDialog.vue';
import {
  EPIC_STATE,
  loadEpics,
  flattenEpics,
  searchableText,
  updateEpicsByIds,
  removeEpicsByIds,
} from './data';

const toCsvCell = (value) => {
  const text = String(value ?? '');
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};

const downloadTextFile = (filename, contents, mimeType) => {
  const blob = new Blob([contents], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

export default {
  name: 'Epics',
  components: {
    EpicsToolbar,
    EpicsHeader,
    BulkActionBar,
    EpicTree,
    RoadmapView,
    RegexBuilderPopover,
    CommandPaletteOverlay,
    ConfirmDialog,
  },
  props: {
    currentUser: {
      type: Object,
      default: () => ({ name: __('Jordan Diaz'), initials: 'JD' }),
    },
  },
  data() {
    return {
      settings: loadSettings(),
      loading: true,
      epics: [],
      search: '',
      regexMode: false,
      regexOpen: false,
      paletteOpen: false,
      confirmDeleteOpen: false,
      view: 'tree',
      collapsedIds: [],
      selectedIds: [],
    };
  },
  computed: {
    isDark() {
      if (this.settings.theme === 'dark') return true;
      if (this.settings.theme === 'light') return false;
      return Boolean(
        typeof window !== 'undefined' &&
          window.matchMedia &&
          window.matchMedia('(prefers-color-scheme: dark)').matches,
      );
    },
    themeClass() {
      if (this.settings.theme === 'dark') return 'gl-mds-epics--dark';
      if (this.settings.theme === 'light') return 'gl-mds-epics--light';
      return '';
    },
    flatEpics() {
      return flattenEpics(this.epics);
    },
    hasQuery() {
      return Boolean(this.search);
    },
    searchValidity() {
      if (!this.regexMode || !this.search) return { valid: true, message: '' };
      return new RegexBuilder({ pattern: this.search, regex: true, flags: 'i' }).snapshot().syntax;
    },
    searchInvalidMessage() {
      return this.searchValidity.valid
        ? ''
        : sprintf(__('Invalid pattern: %{message}'), { message: this.searchValidity.message });
    },
    matcherFn() {
      const query = this.search;
      if (!query) return () => true;
      if (this.regexMode) {
        if (!this.searchValidity.valid) return () => true;
        const expression = new RegExp(query, 'i');
        return (text) => expression.test(text);
      }
      const lower = query.toLowerCase();
      return (text) => text.toLowerCase().includes(lower);
    },
    visibleTreeRows() {
      const matcher = this.matcherFn;
      const collapsedSet = new Set(this.collapsedIds);
      const subtreeMatches = (items) =>
        (items || []).some((item) => matcher(searchableText(item)) || subtreeMatches(item.children));
      const rows = [];
      const walk = (items, depth) => {
        items.forEach((item) => {
          const selfMatches = matcher(searchableText(item));
          const descendantMatches = subtreeMatches(item.children);
          if (!selfMatches && !descendantMatches) return;
          rows.push({ ...item, depth, hasChildren: (item.children || []).length > 0 });
          if (collapsedSet.has(item.id) || !(item.children || []).length) return;
          const childItems = this.hasQuery
            ? item.children.filter((child) => matcher(searchableText(child)) || subtreeMatches(child.children))
            : item.children;
          walk(childItems, depth + 1);
        });
      };
      walk(this.epics, 0);
      return rows;
    },
    visibleRoadmapRows() {
      return this.flatEpics.filter((item) => this.matcherFn(searchableText(item)));
    },
    regexInitial() {
      return this.regexMode ? this.search : '';
    },
    regexCorpus() {
      return this.flatEpics.map(searchableText);
    },
    paletteActions() {
      const actions = [
        {
          id: 'toggle-theme',
          label: this.isDark ? __('Switch to light theme') : __('Switch to dark theme'),
          icon: this.isDark ? 'sun' : 'moon',
          run: this.toggleTheme,
        },
        {
          id: 'view-tree',
          label: __('Switch to epic tree'),
          icon: 'list',
          run: () => this.setView('tree'),
        },
        {
          id: 'view-roadmap',
          label: __('Switch to roadmap'),
          icon: 'timeline',
          run: () => this.setView('roadmap'),
        },
        {
          id: 'open-regex-builder',
          label: __('Open regex builder'),
          icon: 'tune',
          run: this.openRegexBuilder,
        },
      ];
      if (this.search) {
        actions.push({ id: 'clear-search', label: __('Clear search'), icon: 'close', run: () => this.setSearch('') });
      }
      if (this.selectedIds.length) {
        actions.push({
          id: 'clear-selection',
          label: __('Clear selection'),
          icon: 'close',
          run: this.clearSelection,
        });
      }
      return actions;
    },
    selectedCount() {
      return this.selectedIds.length;
    },
  },
  mounted() {
    this._onKeydown = (event) => {
      if (event.ctrlKey && event.shiftKey && (event.key === 'F' || event.key === 'f')) {
        event.preventDefault();
        this.paletteOpen = true;
      } else if (event.key === 'Escape') {
        this.paletteOpen = false;
        this.regexOpen = false;
      }
    };
    window.addEventListener('keydown', this._onKeydown);
    this._unsubscribeSettings = subscribeSettings((settings) => {
      this.settings = settings;
    });
    this.fetchEpics();
  },
  beforeDestroy() {
    window.removeEventListener('keydown', this._onKeydown);
    if (this._unsubscribeSettings) this._unsubscribeSettings();
  },
  methods: {
    async fetchEpics() {
      this.loading = true;
      try {
        this.epics = await loadEpics();
      } finally {
        this.loading = false;
      }
    },
    setSearch(value) {
      this.search = value;
    },
    toggleRegexMode() {
      this.regexMode = !this.regexMode;
    },
    openRegexBuilder() {
      this.regexOpen = true;
    },
    closeRegexBuilder() {
      this.regexOpen = false;
    },
    applyRegex(pattern) {
      this.search = pattern;
      this.regexMode = true;
      this.regexOpen = false;
    },
    openPalette() {
      this.paletteOpen = true;
    },
    closePalette() {
      this.paletteOpen = false;
    },
    toggleTheme() {
      const next = this.isDark ? 'light' : 'dark';
      const result = updateSettings({ theme: next });
      if (result.ok) this.settings = result.value;
    },
    setView(view) {
      this.view = view;
    },
    toggleCollapse(id) {
      this.collapsedIds = this.collapsedIds.includes(id)
        ? this.collapsedIds.filter((existing) => existing !== id)
        : [...this.collapsedIds, id];
    },
    toggleSelect(id) {
      this.selectedIds = this.selectedIds.includes(id)
        ? this.selectedIds.filter((existing) => existing !== id)
        : [...this.selectedIds, id];
    },
    selectAllVisible(shouldSelect) {
      const visibleIds = this.visibleTreeRows.map((row) => row.id);
      if (shouldSelect) {
        this.selectedIds = Array.from(new Set([...this.selectedIds, ...visibleIds]));
      } else {
        const visibleSet = new Set(visibleIds);
        this.selectedIds = this.selectedIds.filter((id) => !visibleSet.has(id));
      }
    },
    invertSelection() {
      const visibleIds = this.visibleTreeRows.map((row) => row.id);
      const selectedSet = new Set(this.selectedIds);
      this.selectedIds = visibleIds.filter((id) => !selectedSet.has(id));
    },
    clearSelection() {
      this.selectedIds = [];
    },
    bulkSetState(state) {
      const count = this.selectedIds.length;
      this.epics = updateEpicsByIds(this.epics, this.selectedIds, () => ({ state }));
      const message =
        state === EPIC_STATE.CLOSED
          ? n__('%d epic closed.', '%d epics closed.', count)
          : n__('%d epic reopened.', '%d epics reopened.', count);
      notificationCenter.notify({ title: __('Epics updated'), message, severity: 'success' });
    },
    exportSelected(format) {
      const selectedSet = new Set(this.selectedIds);
      const items = this.flatEpics.filter((item) => selectedSet.has(item.id));
      if (!items.length) return;
      if (format === 'csv') {
        const header = ['reference', 'title', 'state', 'startDate', 'dueDate', 'closedIssues', 'openedIssues'];
        const rows = items.map((item) =>
          [
            item.reference,
            item.title,
            item.state,
            item.startDate,
            item.dueDate,
            item.descendantCounts.closedIssues,
            item.descendantCounts.openedIssues,
          ]
            .map(toCsvCell)
            .join(','),
        );
        downloadTextFile('epics-export.csv', [header.join(','), ...rows].join('\n'), 'text/csv');
      } else {
        const payload = items.map(({ depth, hasChildren, parentId, children, ...rest }) => rest);
        downloadTextFile('epics-export.json', JSON.stringify(payload, null, 2), 'application/json');
      }
      notificationCenter.notify({
        title: __('Export ready'),
        message: sprintf(__('Downloaded %{count} epics as %{format}.'), { count: items.length, format: format.toUpperCase() }),
        severity: 'success',
      });
    },
    requestDelete() {
      this.confirmDeleteOpen = true;
    },
    cancelDelete() {
      this.confirmDeleteOpen = false;
    },
    confirmDelete() {
      const count = this.selectedIds.length;
      this.epics = removeEpicsByIds(this.epics, this.selectedIds);
      this.selectedIds = [];
      this.confirmDeleteOpen = false;
      notificationCenter.notify({
        title: __('Epics deleted'),
        message: n__('%d epic deleted.', '%d epics deleted.', count),
        severity: 'warning',
      });
    },
    deleteConfirmMessage() {
      return n__(
        'This removes %d epic and all its descendants from this view. This cannot be undone.',
        'This removes %d epics and all their descendants from this view. This cannot be undone.',
        this.selectedCount,
      );
    },
  },
};
</script>

<template>
  <div class="gl-mds-epics" :class="themeClass">
    <epics-toolbar
      :search="search"
      :regex-mode="regexMode"
      :invalid-message="searchInvalidMessage"
      :is-dark="isDark"
      :user-initials="currentUser.initials"
      @update-search="setSearch"
      @toggle-regex-mode="toggleRegexMode"
      @open-regex-builder="openRegexBuilder"
      @open-palette="openPalette"
      @toggle-theme="toggleTheme"
    />
    <epics-header :view="view" @change-view="setView" />
    <bulk-action-bar
      :count="selectedCount"
      @reopen="bulkSetState('opened')"
      @close="bulkSetState('closed')"
      @export="exportSelected"
      @delete="requestDelete"
      @clear="clearSelection"
    />
    <main class="gl-mds-epics__main">
      <epic-tree
        v-if="view === 'tree'"
        :rows="visibleTreeRows"
        :total-count="flatEpics.length"
        :selected-ids="selectedIds"
        :collapsed-ids="collapsedIds"
        :has-query="hasQuery"
        @toggle-collapse="toggleCollapse"
        @toggle-select="toggleSelect"
        @select-all-visible="selectAllVisible"
        @invert-selection="invertSelection"
      />
      <roadmap-view v-else :rows="visibleRoadmapRows" :has-query="hasQuery" />
    </main>
    <regex-builder-popover
      v-if="regexOpen"
      :initial="regexInitial"
      :corpus="regexCorpus"
      :corpus-title="__('Matches in epics')"
      @apply="applyRegex"
      @close="closeRegexBuilder"
    />
    <command-palette-overlay v-if="paletteOpen" :actions="paletteActions" @close="closePalette" />
    <confirm-dialog
      v-if="confirmDeleteOpen"
      :title="__('Delete selected epics?')"
      :message="deleteConfirmMessage()"
      :confirm-label="__('Delete')"
      @confirm="confirmDelete"
      @cancel="cancelDelete"
    />
  </div>
</template>
