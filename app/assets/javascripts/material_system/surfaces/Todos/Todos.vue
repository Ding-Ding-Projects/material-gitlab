<script>
import { loadSettings, updateSettings, subscribeSettings } from '../../settings';
import { notificationCenter } from '../../notifications';
import TodosSidebar from './components/TodosSidebar.vue';
import TodosTopBar from './components/TodosTopBar.vue';
import TodosHeader from './components/TodosHeader.vue';
import TodosSelectionBar from './components/TodosSelectionBar.vue';
import TodoList from './components/TodoList.vue';
import RegexBuilderPopover from './components/RegexBuilderPopover.vue';
import CommandPalette from './components/CommandPalette.vue';
import {
  TODO_VIEWS,
  createSeedTodos,
  createNavSections,
  todoSearchText,
  createTextMatcher,
  isValidRegex,
} from './data';

export default {
  name: 'Todos',
  components: {
    TodosSidebar,
    TodosTopBar,
    TodosHeader,
    TodosSelectionBar,
    TodoList,
    RegexBuilderPopover,
    CommandPalette,
  },
  props: {
    // Renders the full page including the navigation sidebar (matches the
    // design file exactly). Pass false to render only the content region —
    // top bar, header, list — when embedding inside a shared app shell that
    // already owns the sidebar, so navigation chrome is never duplicated.
    standalone: {
      type: Boolean,
      default: true,
    },
  },
  data() {
    return {
      todos: createSeedTodos(),
      navSectionsAll: createNavSections(),
      view: TODO_VIEWS.PENDING,
      search: '',
      regexMode: false,
      navQuery: '',
      navRegexMode: false,
      selectedIds: [],
      regexBuilder: { open: false, target: null },
      paletteOpen: false,
      settings: loadSettings(),
      systemPrefersDark: false,
      lastFocused: null,
    };
  },
  computed: {
    pendingTodos() {
      return this.todos.filter((todo) => todo.state === TODO_VIEWS.PENDING);
    },
    doneTodos() {
      return this.todos.filter((todo) => todo.state === TODO_VIEWS.DONE);
    },
    todosInView() {
      return this.view === TODO_VIEWS.PENDING ? this.pendingTodos : this.doneTodos;
    },
    searchValid() {
      return !this.regexMode || isValidRegex(this.search);
    },
    visibleTodos() {
      const matcher = createTextMatcher(this.search, this.regexMode);
      return this.todosInView.filter((todo) => matcher(todoSearchText(todo)));
    },
    isSearchActive() {
      return Boolean(this.search);
    },
    selectedVisibleCount() {
      const visibleIds = this.visibleTodos.map((todo) => todo.id);
      return this.selectedIds.filter((id) => visibleIds.includes(id)).length;
    },
    allVisibleSelected() {
      return this.visibleTodos.length > 0 && this.selectedVisibleCount === this.visibleTodos.length;
    },
    effectiveDark() {
      if (this.settings.theme === 'dark') return true;
      if (this.settings.theme === 'light') return false;
      return this.systemPrefersDark;
    },
    navQueryValid() {
      return !this.navRegexMode || isValidRegex(this.navQuery);
    },
    navSections() {
      const matcher = createTextMatcher(this.navQuery, this.navRegexMode);
      return this.navSectionsAll
        .map((section) => ({ ...section, items: section.items.filter((item) => matcher(item.label)) }))
        .filter((section) => section.items.length > 0);
    },
    regexBuilderCorpus() {
      if (this.regexBuilder.target === 'nav') {
        return this.navSectionsAll.flatMap((section) => section.items.map((item) => item.label));
      }
      return this.todos.map(todoSearchText);
    },
    regexBuilderTitle() {
      return this.regexBuilder.target === 'nav' ? 'Matches in navigation' : 'Matches in to-dos';
    },
    regexBuilderInitial() {
      if (this.regexBuilder.target === 'nav') return this.navRegexMode ? this.navQuery : '';
      return this.regexMode ? this.search : '';
    },
    paletteActions() {
      return [
        { label: 'Toggle dark theme', icon: 'dark_mode', run: this.toggleTheme },
        { label: 'Mark all done', icon: 'done_all', run: this.markAllDone },
      ];
    },
  },
  mounted() {
    this._onKeydown = (event) => {
      if (event.ctrlKey && event.shiftKey && (event.key === 'F' || event.key === 'f')) {
        event.preventDefault();
        this.openPalette();
      } else if (event.key === 'Escape') {
        this.paletteOpen = false;
        this.regexBuilder.open = false;
      }
    };
    window.addEventListener('keydown', this._onKeydown);

    this._media = window.matchMedia('(prefers-color-scheme: dark)');
    this.systemPrefersDark = this._media.matches;
    this._onMediaChange = (event) => {
      this.systemPrefersDark = event.matches;
    };
    this._media.addEventListener('change', this._onMediaChange);

    this._unsubscribeSettings = subscribeSettings((next) => {
      this.settings = next;
    });
  },
  beforeDestroy() {
    window.removeEventListener('keydown', this._onKeydown);
    if (this._media) this._media.removeEventListener('change', this._onMediaChange);
    if (this._unsubscribeSettings) this._unsubscribeSettings();
  },
  methods: {
    setSearch(value) {
      this.search = value;
    },
    toggleRegexMode() {
      this.regexMode = !this.regexMode;
    },
    setNavQuery(value) {
      this.navQuery = value;
    },
    toggleNavRegexMode() {
      this.navRegexMode = !this.navRegexMode;
    },
    clearSearch() {
      this.search = '';
    },
    changeView(view) {
      this.view = view;
      this.selectedIds = [];
    },
    openRegexBuilder(target) {
      this.lastFocused = document.activeElement;
      this.regexBuilder = { open: true, target };
    },
    closeRegexBuilder() {
      this.regexBuilder.open = false;
      this.restoreFocus();
    },
    applyRegex(pattern) {
      if (this.regexBuilder.target === 'nav') {
        this.navQuery = pattern;
        this.navRegexMode = true;
      } else {
        this.search = pattern;
        this.regexMode = true;
      }
      this.regexBuilder.open = false;
      this.restoreFocus();
    },
    openPalette() {
      this.lastFocused = document.activeElement;
      this.paletteOpen = true;
    },
    closePalette() {
      this.paletteOpen = false;
      this.restoreFocus();
    },
    restoreFocus() {
      if (this.lastFocused && typeof this.lastFocused.focus === 'function') this.lastFocused.focus();
      this.lastFocused = null;
    },
    toggleTheme() {
      const next = this.effectiveDark ? 'light' : 'dark';
      const result = updateSettings({ theme: next });
      if (result.ok) this.settings = result.value;
    },
    setTodoState(id, state) {
      this.todos = this.todos.map((todo) => (todo.id === id ? { ...todo, state } : todo));
    },
    markDone(id) {
      this.setTodoState(id, TODO_VIEWS.DONE);
      this.selectedIds = this.selectedIds.filter((selectedId) => selectedId !== id);
    },
    restore(id) {
      this.setTodoState(id, TODO_VIEWS.PENDING);
      this.selectedIds = this.selectedIds.filter((selectedId) => selectedId !== id);
    },
    markAllDone() {
      const count = this.pendingTodos.length;
      if (count === 0) return;
      this.todos = this.todos.map((todo) => ({ ...todo, state: TODO_VIEWS.DONE }));
      this.selectedIds = [];
      notificationCenter.notify({
        title: 'To-dos updated',
        message: `Marked ${count} to-do${count === 1 ? '' : 's'} as done.`,
        severity: 'success',
      });
    },
    toggleSelect(id) {
      const index = this.selectedIds.indexOf(id);
      if (index === -1) this.selectedIds = [...this.selectedIds, id];
      else this.selectedIds = this.selectedIds.filter((selectedId) => selectedId !== id);
    },
    selectAllVisible() {
      const visibleIds = this.visibleTodos.map((todo) => todo.id);
      const others = this.selectedIds.filter((id) => !visibleIds.includes(id));
      this.selectedIds = [...others, ...visibleIds];
    },
    clearSelection() {
      const visibleIds = this.visibleTodos.map((todo) => todo.id);
      this.selectedIds = this.selectedIds.filter((id) => !visibleIds.includes(id));
    },
    invertSelection() {
      const visibleIds = this.visibleTodos.map((todo) => todo.id);
      const kept = this.selectedIds.filter((id) => !visibleIds.includes(id));
      const inverted = visibleIds.filter((id) => !this.selectedIds.includes(id));
      this.selectedIds = [...kept, ...inverted];
    },
    bulkMarkDone() {
      const targets = this.visibleTodos.filter((todo) => this.selectedIds.includes(todo.id));
      if (targets.length === 0) return;
      const ids = new Set(targets.map((todo) => todo.id));
      this.todos = this.todos.map((todo) => (ids.has(todo.id) ? { ...todo, state: TODO_VIEWS.DONE } : todo));
      this.clearSelection();
      notificationCenter.notify({
        title: 'To-dos updated',
        message: `Marked ${targets.length} to-do${targets.length === 1 ? '' : 's'} as done.`,
        severity: 'success',
      });
    },
    bulkRestore() {
      const targets = this.visibleTodos.filter((todo) => this.selectedIds.includes(todo.id));
      if (targets.length === 0) return;
      const ids = new Set(targets.map((todo) => todo.id));
      this.todos = this.todos.map((todo) => (ids.has(todo.id) ? { ...todo, state: TODO_VIEWS.PENDING } : todo));
      this.clearSelection();
      notificationCenter.notify({
        title: 'To-dos updated',
        message: `Restored ${targets.length} to-do${targets.length === 1 ? '' : 's'} to pending.`,
        severity: 'info',
      });
    },
  },
};
</script>

<template>
  <div class="md-todos" :data-md-theme="effectiveDark ? 'dark' : 'light'">
    <todos-sidebar
      v-if="standalone"
      :sections="navSections"
      active-label="To-Do list"
      :query="navQuery"
      :regex-mode="navRegexMode"
      :regex-valid="navQueryValid"
      @update:query="setNavQuery"
      @toggle-regex-mode="toggleNavRegexMode"
      @open-regex-builder="openRegexBuilder('nav')"
    />

    <div class="md-todos__main">
      <todos-top-bar
        :search="search"
        :regex-mode="regexMode"
        :regex-valid="searchValid"
        :is-dark="effectiveDark"
        @update:search="setSearch"
        @toggle-regex-mode="toggleRegexMode"
        @open-regex-builder="openRegexBuilder('search')"
        @open-palette="openPalette"
        @toggle-theme="toggleTheme"
      />

      <todos-header
        :view="view"
        :pending-count="pendingTodos.length"
        :done-count="doneTodos.length"
        @change-view="changeView"
        @mark-all-done="markAllDone"
      />

      <main class="md-todos__content">
        <todos-selection-bar
          :view="view"
          :selected-count="selectedVisibleCount"
          :visible-count="visibleTodos.length"
          :all-selected="allVisibleSelected"
          @select-all="selectAllVisible"
          @clear-selection="clearSelection"
          @invert-selection="invertSelection"
          @bulk-mark-done="bulkMarkDone"
          @bulk-restore="bulkRestore"
        />

        <todo-list
          :todos="visibleTodos"
          :view="view"
          :selected-ids="selectedIds"
          :has-any-in-view="todosInView.length > 0"
          :search-active="isSearchActive"
          @toggle-select="toggleSelect"
          @mark-done="markDone"
          @restore="restore"
          @clear-search="clearSearch"
        />
      </main>
    </div>

    <regex-builder-popover
      v-if="regexBuilder.open"
      :initial-pattern="regexBuilderInitial"
      :corpus="regexBuilderCorpus"
      :corpus-title="regexBuilderTitle"
      @apply="applyRegex"
      @close="closeRegexBuilder"
    />

    <command-palette v-if="paletteOpen" :actions="paletteActions" @close="closePalette" />
  </div>
</template>

<style lang="scss" src="./todos.scss"></style>
