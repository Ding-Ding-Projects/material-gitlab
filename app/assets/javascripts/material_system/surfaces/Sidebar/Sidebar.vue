<template>
  <nav
    class="material-sidebar"
    data-screen-label="Sidebar"
    aria-label="Primary navigation"
    :class="{ 'material-sidebar--collapsed': collapsed }"
  >
    <a class="material-sidebar__brand" :href="homeHref" aria-label="GitLab home">
      <span class="material-sidebar__mark" aria-hidden="true">G</span>
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

    <div v-if="!filteredSections.length" class="material-sidebar__empty" role="status">
      No navigation matches.
    </div>
    <section v-for="section in filteredSections" :key="section.name" class="material-sidebar__section">
      <h2>{{ section.name }}</h2>
      <a
        v-for="item in section.items"
        :key="item.id || item.href || item.label"
        class="material-sidebar__item"
        :class="{ 'is-active': item.active || item.label === active }"
        :href="item.href || '#'"
        :aria-current="item.active || item.label === active ? 'page' : undefined"
        @click="$emit('navigate', item, $event)"
      >
        <span class="material-sidebar__icon" aria-hidden="true">{{ item.icon || '•' }}</span>
        <span v-if="!collapsed">{{ item.label }}</span>
        <span v-if="item.count != null && !collapsed" class="material-sidebar__count">{{ item.count }}</span>
      </a>
    </section>

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

const DEFAULT_PROJECT = Object.freeze({ name: '', namespace: '' });

export default {
  name: 'MaterialSidebar',
  components: { RegexBuilder },
  props: {
    sections: { type: Array, default: () => [] },
    active: { type: String, default: '' },
    project: { type: Object, default: () => DEFAULT_PROJECT },
    collapsed: { type: Boolean, default: false },
    homeHref: { type: String, default: '/' },
    brand: { type: String, default: 'GitLab M3' },
  },
  data() {
    return { query: '', regexOpen: false, regexMode: false, regexPattern: '', regexFlags: 'i' };
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
    filteredSections() {
      const matcher = this.matcher;
      return this.sections
        .map((section) => ({ ...section, items: section.items.filter((item) => matcher(item.label)) }))
        .filter((section) => section.items.length);
    },
    matcher() {
      if (!this.query) return () => true;
      if (this.regexMode) {
        try {
          const expression = new RegExp(this.regexPattern || this.query, this.regexFlags.replace(/[gy]/g, ''));
          return (value) => expression.test(value);
        } catch (_error) {
          return () => false;
        }
      }
      const needle = this.query.toLocaleLowerCase();
      return (value) => value.toLocaleLowerCase().includes(needle);
    },
  },
  methods: {
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
