<template>
  <div class="mg-surface" :data-mg-theme="explicitThemeAttr">
    <ManageSidebar active-id="manage" :items="sidebarItems" />

    <div class="mg-main">
      <ManageTopBar
        ref="topBar"
        :search="search"
        :search-placeholder="searchPlaceholder"
        :regex-mode="regexMode"
        :search-valid="matcher.valid"
        :search-error="matcher.error"
        :regex-open="regexOpen"
        :regex-initial-pattern="regexMode ? search : ''"
        :regex-corpus="regexCorpus"
        :dark="effectiveDark"
        :user-name="currentUser.name"
        :user-initials="currentUser.initials"
        @update:search="setSearch"
        @toggle-regex-mode="toggleRegexMode"
        @open-regex-builder="openRegexBuilder"
        @close-regex-builder="closeRegexBuilder"
        @apply-regex="applyRegex"
        @open-palette="openPalette"
        @toggle-theme="toggleTheme"
      />

      <ManagePageHeader :tabs="tabs" :active-tab="view" :members-href="routes.members" @select-tab="setView" />

      <main class="mg-main__content">
        <div
          v-if="view === 'activity'"
          id="mg-panel-activity"
          role="tabpanel"
          aria-labelledby="mg-tab-activity"
          tabindex="0"
        >
          <ActivityFeed
            :events="filteredEvents"
            :selected-ids="selectedEventIds"
            @toggle-select="toggleSelectEvent"
            @select-all="selectAllEvents"
            @invert-selection="invertEventSelection"
            @clear-selection="clearEventSelection"
            @bulk-copy-links="copyEventLinks"
            @bulk-copy-details="copyEventDetails"
          />
        </div>
        <div v-if="view === 'labels'" id="mg-panel-labels" role="tabpanel" aria-labelledby="mg-tab-labels" tabindex="0">
          <LabelsList
            :labels="filteredLabels"
            :selected-ids="selectedLabelIds"
            @toggle-select="toggleSelectLabel"
            @select-all="selectAllLabels"
            @invert-selection="invertLabelSelection"
            @clear-selection="clearLabelSelection"
            @request-delete="requestDeleteLabel"
          />
        </div>
      </main>
    </div>

    <CommandPalette v-if="paletteOpen" :actions="paletteActions" @close="closePalette" />

    <ConfirmDialog
      v-if="pendingDeletion"
      :title="confirmTitle"
      :description="confirmDescription"
      :items="pendingDeletion.mode === 'bulk' ? pendingDeletion.names : []"
      confirm-label="Delete"
      @confirm="confirmDeleteLabels"
      @cancel="cancelDeleteLabels"
    />

    <NotificationHost />
  </div>
</template>

<script>
import ManageSidebar from './components/ManageSidebar.vue';
import ManageTopBar from './components/ManageTopBar.vue';
import ManagePageHeader from './components/ManagePageHeader.vue';
import ActivityFeed from './components/ActivityFeed.vue';
import LabelsList from './components/LabelsList.vue';
import CommandPalette from './components/CommandPalette.vue';
import ConfirmDialog from './components/ConfirmDialog.vue';
import NotificationHost from './components/NotificationHost.vue';
import notificationCenter from '../../notifications';
import { loadSettings, updateSettings, subscribeSettings } from '../../settings';
import {
  MANAGE_TABS,
  DEFAULT_MANAGE_ROUTES,
  DEFAULT_SIDEBAR_ITEMS,
  createInitialEvents,
  createInitialLabels,
  eventCorpus,
  labelCorpus,
  createSearchMatcher,
} from './data';

export default {
  name: 'Manage',
  components: {
    ManageSidebar,
    ManageTopBar,
    ManagePageHeader,
    ActivityFeed,
    LabelsList,
    CommandPalette,
    ConfirmDialog,
    NotificationHost,
  },
  props: {
    // Real API data can be passed in; fixtures from the design are the default.
    initialEvents: { type: Array, default: null },
    initialLabels: { type: Array, default: null },
    routes: { type: Object, default: () => DEFAULT_MANAGE_ROUTES },
    currentUser: { type: Object, default: () => ({ name: 'Jordan Diaz', initials: 'JD' }) },
  },
  data() {
    return {
      tabs: MANAGE_TABS,
      view: 'activity',
      search: '',
      regexMode: false,
      regexOpen: false,
      paletteOpen: false,
      events: this.initialEvents || createInitialEvents(),
      labels: this.initialLabels || createInitialLabels(),
      selectedEventIds: [],
      selectedLabelIds: [],
      pendingDeletion: null,
      settings: loadSettings(),
      systemPrefersDark: false,
    };
  },
  computed: {
    matcher() {
      return createSearchMatcher({ query: this.search, regexMode: this.regexMode });
    },
    filteredEvents() {
      return this.events.filter((event) => this.matcher.test(eventCorpus(event)));
    },
    filteredLabels() {
      return this.labels.filter((label) => this.matcher.test(labelCorpus(label)));
    },
    searchPlaceholder() {
      return this.regexMode ? 'Regex search — activity & labels' : 'Search activity & labels';
    },
    regexCorpus() {
      return [...this.events.map(eventCorpus), ...this.labels.map((label) => label.name)];
    },
    sidebarItems() {
      return DEFAULT_SIDEBAR_ITEMS.map((item) => ({ ...item, href: this.routes[item.route] || '#' }));
    },
    effectiveDark() {
      if (this.settings.theme === 'dark') return true;
      if (this.settings.theme === 'light') return false;
      return this.systemPrefersDark;
    },
    explicitThemeAttr() {
      if (this.settings.theme === 'dark') return 'dark';
      if (this.settings.theme === 'light') return 'light';
      return null;
    },
    paletteActions() {
      return [
        { label: 'Toggle dark theme', icon: 'moon', run: () => this.toggleTheme() },
        { label: 'Go to Activity', icon: 'chart', run: () => this.setView('activity') },
        { label: 'Go to Labels', icon: 'tag', run: () => this.setView('labels') },
        { label: 'Focus search field', icon: 'search', run: () => this.focusSearch() },
        { label: 'Open regex builder', icon: 'wrench', run: () => this.openRegexBuilder() },
      ];
    },
    confirmTitle() {
      if (!this.pendingDeletion) return '';
      return this.pendingDeletion.mode === 'bulk'
        ? `Delete ${this.pendingDeletion.ids.length} labels?`
        : `Delete label "${this.pendingDeletion.names[0]}"?`;
    },
    confirmDescription() {
      if (!this.pendingDeletion) return '';
      return this.pendingDeletion.mode === 'bulk'
        ? 'This removes the following labels from the project. This cannot be undone.'
        : 'This removes the label from the project and every issue it is applied to. This cannot be undone.';
    },
  },
  mounted() {
    this._onKeydown = (event) => {
      if (event.ctrlKey && event.shiftKey && (event.key === 'F' || event.key === 'f')) {
        event.preventDefault();
        this.paletteOpen = true;
      }
      if (event.key === 'Escape') {
        this.paletteOpen = false;
        this.regexOpen = false;
      }
    };
    window.addEventListener('keydown', this._onKeydown);

    this._unsubscribeSettings = subscribeSettings((next) => {
      this.settings = next;
    });

    if (window.matchMedia) {
      this._mql = window.matchMedia('(prefers-color-scheme: dark)');
      this.systemPrefersDark = this._mql.matches;
      this._onMqlChange = (event) => {
        this.systemPrefersDark = event.matches;
      };
      if (this._mql.addEventListener) this._mql.addEventListener('change', this._onMqlChange);
      else if (this._mql.addListener) this._mql.addListener(this._onMqlChange);
    }
  },
  beforeDestroy() {
    window.removeEventListener('keydown', this._onKeydown);
    if (this._unsubscribeSettings) this._unsubscribeSettings();
    if (this._mql) {
      if (this._mql.removeEventListener) this._mql.removeEventListener('change', this._onMqlChange);
      else if (this._mql.removeListener) this._mql.removeListener(this._onMqlChange);
    }
  },
  methods: {
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
    setView(id) {
      this.view = id;
    },
    focusSearch() {
      this.$refs.topBar && this.$refs.topBar.focusSearch();
    },
    toggleTheme() {
      const nextTheme = this.effectiveDark ? 'light' : 'dark';
      const result = updateSettings({ theme: nextTheme });
      if (result.ok) this.settings = result.value;
    },
    toggleInList(list, id) {
      return list.includes(id) ? list.filter((existing) => existing !== id) : [...list, id];
    },
    toggleSelectEvent(id) {
      this.selectedEventIds = this.toggleInList(this.selectedEventIds, id);
    },
    selectAllEvents() {
      this.selectedEventIds = this.filteredEvents.map((event) => event.id);
    },
    invertEventSelection() {
      const visible = this.filteredEvents.map((event) => event.id);
      this.selectedEventIds = visible.filter((id) => !this.selectedEventIds.includes(id));
    },
    clearEventSelection() {
      this.selectedEventIds = [];
    },
    async copyEventLinks() {
      const links = this.events.filter((event) => this.selectedEventIds.includes(event.id)).map((event) => event.targetUrl);
      const ok = await this.copyText(links.join('\n'));
      notificationCenter.notify({
        title: ok ? 'Links copied' : 'Copy failed',
        message: ok ? `${links.length} link${links.length === 1 ? '' : 's'} copied to your clipboard.` : 'Your browser blocked clipboard access.',
        severity: ok ? 'success' : 'error',
      });
    },
    async copyEventDetails() {
      const selected = this.events.filter((event) => this.selectedEventIds.includes(event.id));
      const text = selected
        .map((event) => `${event.author.name} ${event.actionName} ${event.targetTitle} — ${event.targetUrl}`)
        .join('\n');
      const ok = await this.copyText(text);
      notificationCenter.notify({
        title: ok ? 'Details copied' : 'Copy failed',
        message: ok ? `${selected.length} event${selected.length === 1 ? '' : 's'} copied to your clipboard.` : 'Your browser blocked clipboard access.',
        severity: ok ? 'success' : 'error',
      });
    },
    async copyText(text) {
      try {
        if (navigator.clipboard && navigator.clipboard.writeText) {
          await navigator.clipboard.writeText(text);
          return true;
        }
      } catch (_error) {
        return false;
      }
      return false;
    },
    toggleSelectLabel(id) {
      this.selectedLabelIds = this.toggleInList(this.selectedLabelIds, id);
    },
    selectAllLabels() {
      this.selectedLabelIds = this.filteredLabels.map((label) => label.id);
    },
    invertLabelSelection() {
      const visible = this.filteredLabels.map((label) => label.id);
      this.selectedLabelIds = visible.filter((id) => !this.selectedLabelIds.includes(id));
    },
    clearLabelSelection() {
      this.selectedLabelIds = [];
    },
    requestDeleteLabel({ mode, ids }) {
      const names = this.labels.filter((label) => ids.includes(label.id)).map((label) => label.name);
      this.pendingDeletion = { mode, ids, names };
    },
    confirmDeleteLabels() {
      if (!this.pendingDeletion) return;
      const { ids, names } = this.pendingDeletion;
      this.labels = this.labels.filter((label) => !ids.includes(label.id));
      this.selectedLabelIds = this.selectedLabelIds.filter((id) => !ids.includes(id));
      notificationCenter.notify({
        title: names.length > 1 ? 'Labels deleted' : 'Label deleted',
        message: names.join(', '),
        severity: 'success',
      });
      this.pendingDeletion = null;
    },
    cancelDeleteLabels() {
      this.pendingDeletion = null;
    },
  },
};
</script>

<style lang="scss">
// Deliberately unscoped: manage.scss defines the token layer and shared utility
// classes (.mg-visually-hidden, reduced-motion) that child components rely on,
// all namespaced under .mg-surface so nothing here can bleed outside it.
@import './manage.scss';

.mg-surface {
  display: flex;
  height: 100vh;
  overflow: hidden;
}

.mg-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.mg-main__content {
  flex: 1;
  overflow-y: auto;
  padding: 8px 24px 24px;

  [role='tabpanel']:focus-visible {
    outline: 2px solid var(--mg-prim);
    outline-offset: 2px;
    border-radius: 8px;
  }
}
</style>
