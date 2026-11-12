<template>
  <nav
    class="material-sidebar"
    data-screen-label="Sidebar"
    :data-theme="theme"
    aria-label="Primary navigation, tab strip docked left"
    :class="{ 'material-sidebar--collapsed': collapsed }"
  >
    <a class="material-sidebar__brand" :href="homeHref" aria-label="GitLab home">
      <img
        v-if="feature && feature.state.logo"
        class="material-sidebar__mark"
        :src="feature.state.logo"
        alt=""
      />
      <span v-else class="material-sidebar__mark" aria-hidden="true">G</span>
      <span v-if="!collapsed">{{ brand }}</span>
    </a>

    <div v-if="!collapsed" class="material-sidebar__project" data-testid="sidebar-project">
      <span class="material-sidebar__project-mark" aria-hidden="true">{{ projectInitial }}</span>
      <span class="material-sidebar__project-copy">
        <strong>{{ project.name }}</strong>
        <small>{{ project.namespace }}</small>
      </span>
    </div>

    <div class="material-sidebar__search-wrap">
      <label class="sr-only" :for="searchId">Search or go to</label>
      <input
        :id="searchId"
        ref="search"
        v-model="query"
        class="material-sidebar__search"
        type="search"
        placeholder="Search or go to…"
        autocomplete="off"
        @keydown.enter="activateFirst"
      />
      <button
        type="button"
        class="material-sidebar__search-builder"
        aria-label="Open regex builder for sidebar search"
        @click="regexOpen = true"
      >
        .*
      </button>
    </div>

    <div class="material-sidebar__tab-tools" role="toolbar" aria-label="Tab tools">
      <button
        type="button"
        class="material-sidebar__tool material-sidebar__tool--new"
        data-testid="tab-strip-new-tab"
        aria-haspopup="dialog"
        @click="catalogOpen = true"
      >
        <span aria-hidden="true">+</span> New tab
      </button>
      <button
        type="button"
        class="material-sidebar__tool"
        data-testid="tab-strip-open-every"
        :disabled="!closedCount"
        :title="closedCount ? `Reopen ${closedCount} closed tabs` : 'Every tab is already open'"
        @click="openEvery"
      >
        Open every tab
      </button>
    </div>

    <div v-if="!filteredSections.length" class="material-sidebar__empty" role="status">
      No open tab matches.
    </div>
    <div
      class="material-sidebar__tabs"
      role="tablist"
      aria-orientation="vertical"
      aria-label="Open tabs, docked left"
      data-testid="tab-strip"
      @keydown="onTabKeydown"
    >
      <section
        v-for="section in filteredSections"
        :key="section.name || 'top'"
        class="material-sidebar__section"
        role="group"
        :aria-label="section.name ? `Tab group ${section.name}` : 'Tabs'"
      >
        <button
          v-if="section.name"
          type="button"
          class="material-sidebar__group"
          :aria-expanded="String(!isCollapsed(section))"
          :data-testid="`tab-group-${section.name}`"
          @click="toggleGroup(section)"
        >
          <span class="material-sidebar__group-dot" aria-hidden="true"></span>
          <span>{{ section.name }}</span>
          <span class="material-sidebar__count">{{ section.items.length }}</span>
        </button>
        <template v-if="!isCollapsed(section)">
          <div
            v-for="item in section.items"
            :key="tabId(item)"
            class="material-sidebar__tab"
            :class="{ 'is-active': isActive(item) }"
          >
            <a
              class="material-sidebar__item"
              :class="{ 'is-active': isActive(item) }"
              role="tab"
              :href="item.href || '#'"
              :aria-selected="String(isActive(item))"
              :aria-current="isActive(item) ? 'page' : undefined"
              :tabindex="isActive(item) ? 0 : -1"
              :data-tab-id="tabId(item)"
              @click="onTabClick(item, $event)"
            >
              <span class="material-sidebar__icon" aria-hidden="true">{{ item.icon || '•' }}</span>
              <span v-if="!collapsed">{{ item.label }}</span>
              <svg
                v-if="isTabLocked(item)"
                class="material-sidebar__lock"
                viewBox="0 0 24 24"
                width="14"
                height="14"
                role="img"
                :aria-label="`${item.label} is locked`"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
              >
                <rect x="5" y="11" width="14" height="10" rx="2" />
                <path d="M8 11V8a4 4 0 0 1 8 0v3" />
              </svg>
              <span v-if="item.count != null && !collapsed" class="material-sidebar__count">{{
                item.count
              }}</span>
            </a>
            <button
              type="button"
              class="material-sidebar__close"
              :aria-label="`Close tab ${item.label}`"
              :data-testid="`close-tab-${tabId(item)}`"
              @click="closeTab(item)"
            >
              <span aria-hidden="true">×</span>
            </button>
          </div>
        </template>
      </section>
    </div>
    <p class="material-sidebar__tally" aria-live="polite">
      {{ openCount }} tabs open · {{ closedCount }} closed
    </p>

    <div
      v-if="catalogOpen"
      class="material-sidebar__catalog"
      role="dialog"
      aria-modal="true"
      aria-label="New tab"
      data-testid="tab-strip-catalog"
      @keydown.esc="catalogOpen = false"
    >
      <label class="sr-only" :for="`${searchId}-catalog`">Search every page</label>
      <input
        :id="`${searchId}-catalog`"
        ref="catalogSearch"
        v-model="catalogQuery"
        class="material-sidebar__search"
        type="search"
        placeholder="Search every page"
        autocomplete="off"
      />
      <ul class="material-sidebar__catalog-list">
        <li v-for="item in catalogItems" :key="tabId(item)">
          <button type="button" class="material-sidebar__catalog-item" @click="openTab(item)">
            {{ item.label }}
            <small v-if="!tabState.isOpen(tabId(item))">closed</small>
          </button>
        </li>
      </ul>
      <button type="button" class="material-sidebar__tool" @click="catalogOpen = false">
        Close
      </button>
    </div>

    <regex-builder
      v-if="regexOpen"
      :initial="query"
      :corpus="corpus"
      target-label="sidebar search"
      @apply="applyRegex"
      @close="regexOpen = false"
    />
  </nav>
</template>

<script>
import RegexBuilder from '../RegexBuilder/RegexBuilder.vue';
import { createTabStripState } from '../../tab-strip-state';

const DEFAULT_PROJECT = Object.freeze({ name: '', namespace: '' });

export default {
  name: 'MaterialSidebar',
  components: { RegexBuilder },
  props: {
    theme: { type: String, default: 'light' },
    sections: { type: Array, default: () => [] },
    active: { type: String, default: '' },
    project: { type: Object, default: () => DEFAULT_PROJECT },
    collapsed: { type: Boolean, default: false },
    homeHref: { type: String, default: '/' },
    brand: { type: String, default: 'GitLab M3' },
    storage: { type: Object, default: () => globalThis.localStorage },
    // Optional shared feature state: enables element locks on tabs and the custom logo.
    feature: { type: Object, default: null },
  },
  data() {
    return {
      query: '',
      regexOpen: false,
      regexMode: false,
      regexPattern: '',
      regexFlags: 'i',
      catalogOpen: false,
      catalogQuery: '',
      // Bumped on every strip change so computed values re-read the persisted state.
      revision: 0,
      tabState: null,
    };
  },
  computed: {
    searchId() {
      return `material-sidebar-search-${this._uid}`;
    },
    corpus() {
      return this.sections.flatMap((section) => section.items.map((item) => item.label));
    },
    projectInitial() {
      return (this.project.name || 'P').trim().charAt(0).toUpperCase() || 'P';
    },
    allItems() {
      return this.sections.flatMap((section) => section.items);
    },
    filteredSections() {
      const matcher = this.matcher;
      // eslint-disable-next-line no-unused-expressions
      this.revision;
      return this.sections
        .map((section) => ({
          ...section,
          items: section.items.filter(
            (item) =>
              (this.tabState.isOpen(this.tabId(item)) || this.isActive(item)) &&
              matcher(item.label),
          ),
        }))
        .filter((section) => section.items.length);
    },
    closedCount() {
      // eslint-disable-next-line no-unused-expressions
      this.revision;
      return this.tabState.closedIds().length;
    },
    openCount() {
      return this.allItems.length - this.closedCount;
    },
    catalogItems() {
      // eslint-disable-next-line no-unused-expressions
      this.revision;
      const needle = this.catalogQuery.toLocaleLowerCase();
      return this.allItems.filter((item) => item.label.toLocaleLowerCase().includes(needle));
    },
    matcher() {
      if (!this.query) return () => true;
      if (this.regexMode) {
        try {
          const expression = new RegExp(
            this.regexPattern || this.query,
            this.regexFlags.replace(/[gy]/g, ''),
          );
          return (value) => expression.test(value);
        } catch (_error) {
          return () => false;
        }
      }
      const needle = this.query.toLocaleLowerCase();
      return (value) => value.toLocaleLowerCase().includes(needle);
    },
  },
  watch: {
    catalogOpen(open) {
      if (open) this.$nextTick(() => this.$refs.catalogSearch?.focus());
    },
  },
  created() {
    this.feature?.setTabTargets(
      this.allItems.map((item) => ({ id: this.tabId(item), label: item.label })),
    );
    this.tabState = createTabStripState(
      this.allItems.map((item) => this.tabId(item)),
      { storage: this.storage },
    );
  },
  methods: {
    isTabLocked(item) {
      return Boolean(this.feature?.isLocked(`tab:${this.tabId(item)}`));
    },
    onTabClick(item, event) {
      if (this.isTabLocked(item)) {
        event.preventDefault();
        this.feature.requestUnlock(`tab:${this.tabId(item)}`, item.href || null);
        return;
      }
      this.$emit('navigate', item, event);
    },
    tabId(item) {
      return item.id || item.href || item.label;
    },
    isActive(item) {
      return Boolean(item.active || item.label === this.active);
    },
    isCollapsed(section) {
      // eslint-disable-next-line no-unused-expressions
      this.revision;
      if (section.items.some((item) => this.isActive(item))) return false;
      return Boolean(section.name) && this.tabState.isCollapsed(section.name);
    },
    toggleGroup(section) {
      this.tabState.setCollapsed(section.name, !this.isCollapsed(section));
      this.revision += 1;
    },
    closeTab(item) {
      this.tabState.close(this.tabId(item));
      this.revision += 1;
    },
    openTab(item) {
      this.tabState.open(this.tabId(item));
      this.revision += 1;
      this.catalogOpen = false;
      this.$emit('reopen', item);
    },
    openEvery() {
      this.tabState.openEvery();
      this.revision += 1;
    },
    onTabKeydown(event) {
      const tabs = [...this.$el.querySelectorAll('[role="tab"]')];
      const index = tabs.indexOf(document.activeElement);
      if (index === -1) return;
      if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        event.preventDefault();
        const next =
          tabs[(index + (event.key === 'ArrowDown' ? 1 : -1) + tabs.length) % tabs.length];
        next.focus();
      } else if (event.key === 'Delete') {
        const item = this.allItems.find((entry) => this.tabId(entry) === tabs[index].dataset.tabId);
        if (item) this.closeTab(item);
      }
    },
    activateFirst(event) {
      const item = this.filteredSections[0]?.items[0];
      if (!item) return;
      this.$emit('navigate', item, event);
    },
    applyRegex({ pattern, flags }) {
      this.regexPattern = pattern;
      this.regexFlags = flags || 'i';
      this.regexMode = true;
      this.query = pattern;
      this.regexOpen = false;
    },
    focusSearch() {
      this.$refs.search?.focus();
    },
  },
};
</script>

<style lang="scss" src="../shared-shell.scss"></style>
