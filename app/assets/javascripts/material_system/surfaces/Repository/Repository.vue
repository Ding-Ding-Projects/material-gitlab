<script>
import { loadSettings, updateSettings } from '../../settings';
import notificationCenter from '../../notifications';
import { assertRepositoryAdapter, normalizeRepositoryData } from './data';
import RepositoryTopBar from './components/RepositoryTopBar.vue';
import RepositoryHeader from './components/RepositoryHeader.vue';
import LanguageBar from './components/LanguageBar.vue';
import BranchSwitcher from './components/BranchSwitcher.vue';
import Breadcrumbs from './components/Breadcrumbs.vue';
import FileTree from './components/FileTree.vue';
import CommitsPanel from './components/CommitsPanel.vue';
import BlobViewer from './components/BlobViewer.vue';
import RegexBuilderDialog from './components/RegexBuilderDialog.vue';
import CommandPalette from './components/CommandPalette.vue';
import DeleteConfirmDialog from './components/DeleteConfirmDialog.vue';
import NotificationHost from './components/NotificationHost.vue';

const initials = (name) =>
  name
    .split(' ')
    .map((word) => word[0])
    .join('');

const initialDark = () => {
  const settings = loadSettings();
  if (settings.theme === 'dark') return true;
  if (settings.theme === 'light') return false;
  return Boolean(window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches);
};

export default {
  name: 'Repository',
  components: {
    RepositoryTopBar,
    RepositoryHeader,
    LanguageBar,
    BranchSwitcher,
    Breadcrumbs,
    FileTree,
    CommitsPanel,
    BlobViewer,
    RegexBuilderDialog,
    CommandPalette,
    DeleteConfirmDialog,
    NotificationHost,
  },
  props: {
    adapter: {
      type: Object,
      required: true,
    },
  },
  data() {
    return {
      repository: null,
      loading: true,
      loadError: '',
      dark: initialDark(),
      search: '',
      regexMode: false,
      regexOpen: false,
      paletteOpen: false,
      deleteConfirmOpen: false,
      currentBranch: '',
      path: [],
      blobName: null,
      selected: [],
    };
  },
  computed: {
    searchRegex() {
      if (!this.regexMode || !this.search) return { valid: true, message: '', test: () => true };
      try {
        const expression = new RegExp(this.search, 'i');
        return { valid: true, message: '', test: (value) => expression.test(value) };
      } catch (error) {
        return { valid: false, message: error.message, test: () => true };
      }
    },
    searchInvalid() {
      return this.regexMode && Boolean(this.search) && !this.searchRegex.valid;
    },
    matcherFn() {
      if (!this.search) return () => true;
      if (this.regexMode) return this.searchRegex.test;
      const query = this.search.toLowerCase();
      return (value) => value.toLowerCase().includes(query);
    },
    pathKey() {
      return this.path.join('/');
    },
    rawEntries() {
      return this.repository?.tree?.[this.pathKey] || [];
    },
    filteredEntries() {
      const match = this.matcherFn;
      return this.rawEntries.filter((entry) => match(entry.name));
    },
    activeBlob() {
      if (!this.blobName) return null;
      const blob = this.repository?.blobs?.[this.blobName];
      return blob ? { name: this.blobName, ...blob } : null;
    },
    scopeLabel() {
      return this.path.length ? this.pathKey : 'the repository root';
    },
    breadcrumbs() {
      return [
        { name: this.repository?.project?.name || 'Repository', path: [] },
        ...this.path.map((segment, index) => ({ name: segment, path: this.path.slice(0, index + 1) })),
      ];
    },
    regexCorpus() {
      return Object.values(this.repository?.tree || {})
        .flat()
        .map((entry) => entry.name);
    },
    commitsWithAvatars() {
      return (this.repository?.commits || []).map((commit) => ({ ...commit, avatar: initials(commit.author) }));
    },
    paletteActions() {
      const actions = [
        {
          id: 'theme',
          label: this.dark ? 'Switch to light theme' : 'Switch to dark theme',
          icon: this.dark ? 'sun' : 'moon',
          kind: 'Action',
          run: () => this.toggleTheme(),
        },
        { id: 'regex', label: 'Open regex builder', icon: 'tool', kind: 'Action', run: () => this.openRegexBuilder() },
        { id: 'search', label: 'Focus file search', icon: 'search', kind: 'Action', run: () => this.focusSearch() },
      ];
      if (this.path.length || this.blobName) {
        actions.push({ id: 'root', label: 'Go to repository root', icon: 'folder', kind: 'Page', run: () => this.navigateTo([]) });
      }
      (this.repository?.branches || [])
        .filter((branch) => branch !== this.currentBranch)
        .forEach((branch) => {
          actions.push({
            id: `branch-${branch}`,
            label: `Switch to branch ${branch}`,
            icon: 'branch',
            kind: 'Page',
            run: () => this.switchBranch(branch),
          });
        });
      Object.keys(this.repository?.blobs || {}).forEach((name) => {
        actions.push({ id: `file-${name}`, label: `Open ${name}`, icon: 'file', kind: 'Page', run: () => this.openFileByName(name) });
      });
      return actions;
    },
  },
  mounted() {
    try {
      assertRepositoryAdapter(this.adapter);
    } catch (error) {
      this.loading = false;
      this.loadError = error.message;
    }
    if (!this.loadError) this.loadRepository();
    this._onKeydown = (event) => {
      if (event.ctrlKey && event.shiftKey && (event.key === 'F' || event.key === 'f')) {
        event.preventDefault();
        if (this.regexOpen || this.deleteConfirmOpen) return;
        if (this.paletteOpen) this.closePalette();
        else this.openPalette();
      } else if (event.key === 'Escape') {
        this.closeAllOverlays();
      }
    };
    window.addEventListener('keydown', this._onKeydown);
  },
  beforeDestroy() {
    window.removeEventListener('keydown', this._onKeydown);
  },
  methods: {
    async loadRepository() {
      if (!this.adapter) return;
      const requestId = (this._requestId = (this._requestId || 0) + 1);
      this.loading = true;
      this.loadError = '';
      try {
        const value = normalizeRepositoryData(await this.adapter.load({
          branch: this.currentBranch || undefined,
          path: this.pathKey,
        }));
        if (requestId !== this._requestId) return;
        this.repository = value;
        if (!this.currentBranch) this.currentBranch = value.defaultBranch;
      } catch (error) {
        if (requestId === this._requestId) this.loadError = error?.message || 'Repository data could not be loaded.';
      } finally {
        if (requestId === this._requestId) this.loading = false;
      }
    },
    async runAdapterAction(action, payload, successMessage) {
      try {
        const result = await action.call(this.adapter, payload);
        if (result?.repository) this.repository = normalizeRepositoryData(result.repository);
        if (result?.project && this.repository) this.repository.project = { ...this.repository.project, ...result.project };
        if (successMessage) this.notify({ severity: 'success', message: successMessage });
        return result;
      } catch (error) {
        this.notify({ severity: 'error', message: error?.message || 'Repository action failed.' });
        return null;
      }
    },
    notify(payload) {
      notificationCenter.notify(payload);
    },
    rememberFocus() {
      this._lastFocused = document.activeElement;
    },
    restoreFocus() {
      if (this._lastFocused && typeof this._lastFocused.focus === 'function') this._lastFocused.focus();
      this._lastFocused = null;
    },
    closeAllOverlays() {
      if (this.deleteConfirmOpen) this.cancelDelete();
      if (this.paletteOpen) this.closePalette();
      if (this.regexOpen) this.closeRegexBuilder();
      if (this.$refs.branchSwitcher) this.$refs.branchSwitcher.closeMenu();
    },
    setSearch(value) {
      this.search = value;
    },
    toggleRegexMode() {
      this.regexMode = !this.regexMode;
    },
    focusSearch() {
      this.$nextTick(() => {
        const field = document.getElementById('repo-file-search');
        if (field) field.focus();
      });
    },
    openRegexBuilder() {
      this.rememberFocus();
      this.regexOpen = true;
    },
    closeRegexBuilder() {
      this.regexOpen = false;
      this.restoreFocus();
    },
    applyRegex(pattern) {
      this.search = pattern;
      this.regexMode = true;
      this.regexOpen = false;
      this.restoreFocus();
    },
    openPalette() {
      this.rememberFocus();
      this.paletteOpen = true;
    },
    closePalette() {
      this.paletteOpen = false;
      this.restoreFocus();
    },
    toggleTheme() {
      this.dark = !this.dark;
      updateSettings({ theme: this.dark ? 'dark' : 'light' });
    },
    async switchBranch(branch) {
      this.currentBranch = branch;
      this.path = [];
      this.blobName = null;
      this.selected = [];
      await this.loadRepository();
    },
    async navigateTo(path) {
      this.path = path;
      this.blobName = null;
      this.selected = [];
      await this.loadRepository();
    },
    async openEntry(entry) {
      if (entry.kind === 'dir') {
        await this.navigateTo([...this.path, entry.name]);
        return;
      }
      try {
        const blob = await this.adapter.loadBlob({ path: entry.path || [...this.path, entry.name].join('/'), branch: this.currentBranch });
        this.$set(this.repository.blobs, entry.name, blob);
        this.blobName = entry.name;
      } catch (error) {
        this.notify({ severity: 'error', message: error?.message || `Unable to load ${entry.name}.` });
      }
    },
    async openFileByName(name) {
      this.path = [];
      this.selected = [];
      await this.openEntry({ name, kind: 'file', path: name });
    },
    closeBlob() {
      this.blobName = null;
    },
    toggleSelect(name) {
      this.selected = this.selected.includes(name) ? this.selected.filter((entry) => entry !== name) : [...this.selected, name];
    },
    toggleSelectAll() {
      const allSelected = this.filteredEntries.length > 0 && this.filteredEntries.every((entry) => this.selected.includes(entry.name));
      this.selected = allSelected ? [] : this.filteredEntries.map((entry) => entry.name);
    },
    invertSelection() {
      this.selected = this.filteredEntries.filter((entry) => !this.selected.includes(entry.name)).map((entry) => entry.name);
    },
    clearSelection() {
      this.selected = [];
    },
    clearSearch() {
      this.search = '';
    },
    async copyPaths() {
      const paths = this.selected.map((name) => [...this.path, name].join('/'));
      try {
        await navigator.clipboard.writeText(paths.join('\n'));
        this.notify({ severity: 'success', message: `Copied ${paths.length} path${paths.length === 1 ? '' : 's'} to the clipboard.` });
      } catch (_error) {
        this.notify({ severity: 'error', message: 'Could not copy paths — clipboard access was denied.' });
      }
    },
    async downloadSelected() {
      const paths = this.selected.map((name) => [...this.path, name].join('/'));
      await this.runAdapterAction(this.adapter.download, { paths, branch: this.currentBranch }, `Download requested for ${paths.length} item${paths.length === 1 ? '' : 's'}.`);
    },
    requestDelete() {
      this.rememberFocus();
      this.deleteConfirmOpen = true;
    },
    cancelDelete() {
      this.deleteConfirmOpen = false;
      this.restoreFocus();
    },
    async confirmDelete() {
      const removed = [...this.selected];
      const result = await this.runAdapterAction(this.adapter.deleteEntries, { paths: removed.map((name) => [...this.path, name].join('/')), branch: this.currentBranch }, `Delete requested for ${removed.length} item${removed.length === 1 ? '' : 's'}.`);
      if (result) {
        this.selected = [];
        this.deleteConfirmOpen = false;
        this.restoreFocus();
        await this.loadRepository();
      }
    },
    async toggleStar() {
      await this.runAdapterAction(this.adapter.toggleStar, { branch: this.currentBranch }, 'Star preference updated.');
      await this.loadRepository();
    },
    async fork() {
      await this.runAdapterAction(this.adapter.fork, { branch: this.currentBranch }, 'Fork request submitted.');
      await this.loadRepository();
    },
  },
};
</script>

<template>
  <div class="mtl-repo" :class="{ 'mtl-repo--dark': dark }" :data-mtl-theme="dark ? 'dark' : 'light'">
    <repository-top-bar
      :search="search"
      :regex-mode="regexMode"
      :search-invalid="searchInvalid"
      :regex-open="regexOpen"
      :palette-open="paletteOpen"
      :dark="dark"
      @update-search="setSearch"
      @toggle-regex-mode="toggleRegexMode"
      @open-regex-builder="openRegexBuilder"
      @open-palette="openPalette"
      @toggle-theme="toggleTheme"
    />

    <main class="mtl-repo__main" tabindex="-1">
      <p v-if="loading" class="mtl-repo__status" role="status">Loading repository data…</p>
      <div v-else-if="loadError" class="mtl-repo__status mtl-repo__status--error" role="alert">
        <strong>Repository unavailable</strong>
        <span>{{ loadError }}</span>
      </div>
      <template v-else>
        <repository-header :project="repository.project" @toggle-star="toggleStar" @fork="fork" @notify="notify" />

        <language-bar :languages="repository.languages" />

        <div class="mtl-repo__nav-row">
          <branch-switcher ref="branchSwitcher" :branches="repository.branches" :active-branch="currentBranch" @switch="switchBranch" />
          <breadcrumbs :crumbs="breadcrumbs" @navigate="navigateTo" />
        </div>

        <blob-viewer v-if="activeBlob" :blob="activeBlob" @close="closeBlob" />

        <div v-else class="mtl-repo__browser">
          <file-tree
            :entries="filteredEntries"
            :selected="selected"
            :scope-label="scopeLabel"
            :search-query="search"
            @open="openEntry"
            @toggle-select="toggleSelect"
            @toggle-select-all="toggleSelectAll"
            @invert-selection="invertSelection"
            @clear-selection="clearSelection"
            @copy-paths="copyPaths"
            @download-selected="downloadSelected"
            @request-delete="requestDelete"
            @clear-search="clearSearch"
          />
          <commits-panel :commits="commitsWithAvatars" @notify="notify" />
        </div>
      </template>
    </main>

    <regex-builder-dialog
      v-if="regexOpen"
      :initial-pattern="regexMode ? search : ''"
      :corpus="regexCorpus"
      corpus-title="Matches in files"
      @apply="applyRegex"
      @close="closeRegexBuilder"
    />
    <command-palette v-if="paletteOpen" :actions="paletteActions" @close="closePalette" />
    <delete-confirm-dialog
      v-if="deleteConfirmOpen"
      :items="selected"
      :scope-label="scopeLabel"
      @confirm="confirmDelete"
      @cancel="cancelDelete"
    />
    <notification-host />
  </div>
</template>

<style lang="scss" scoped>
@import './repository.scss';

.mtl-repo {
  @include tokens-light;

  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
  background: var(--surf);
  color: var(--onsurf);
  font-family: $font-stack;
  overflow: hidden;

  &--dark {
    @include tokens-dark;
  }
}

.mtl-repo__main {
  flex: 1;
  overflow-y: auto;
  padding: 8px 24px 24px;
  display: flex;
  flex-direction: column;
  gap: 14px;

  &:focus {
    outline: none;
  }
}

.mtl-repo__status {
  @include card-surface;
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 6px;
  color: var(--onsurfv);
}

.mtl-repo__status--error {
  color: var(--err);
}

.mtl-repo__nav-row {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.mtl-repo__browser {
  display: grid;
  grid-template-columns: 1fr 340px;
  gap: 14px;
  align-items: start;

  @media (max-width: 860px) {
    grid-template-columns: 1fr;
  }
}
</style>
