<template>
  <div class="material-shell material-shell--a" data-screen-label="Shell A" :data-theme="theme">
    <slot name="sidebar"><material-sidebar v-if="!chromeOnly" :sections="sections" :active="active" /></slot>
    <div class="material-shell__body">
      <header class="material-shell__topbar" role="banner">
        <button v-if="!chromeOnly" type="button" class="material-shell__menu" aria-label="Toggle sidebar" @click="$emit('toggle-sidebar')">☰</button>
        <a class="material-shell__brand" :href="homeHref">{{ brand }}</a>
        <div class="material-shell__search-wrap">
          <label class="sr-only" :for="searchId">Search</label>
          <input :id="searchId" ref="search" v-model="query" type="search" placeholder="Search or go to…" @keydown.enter="submitSearch" />
          <button type="button" class="material-shell__regex" aria-label="Open regex builder for search" @click="regexOpen = true">.*</button>
        </div>
        <button type="button" class="material-shell__icon-button" aria-label="Open command palette (Ctrl+Shift+F)" @click="paletteOpen = true">⌘</button>
        <button type="button" class="material-shell__icon-button" aria-label="Toggle theme" @click="toggleTheme">{{ theme === 'dark' ? '☀' : '☾' }}</button>
        <slot name="actions" />
      </header>
      <main v-if="!chromeOnly" class="material-shell__main"><slot /></main>
    </div>
    <regex-builder v-if="regexOpen" :initial="query" :corpus="corpus" target-label="global search" @apply="applyRegex" @close="regexOpen = false" />
    <command-palette v-if="paletteOpen" :actions="paletteActions" @close="paletteOpen = false" />
  </div>
</template>

<script>
import CommandPalette from '../CommandPalette/CommandPalette.vue';
import RegexBuilder from '../RegexBuilder/RegexBuilder.vue';
import Sidebar from '../Sidebar/Sidebar.vue';

export default {
  name: 'MaterialShellA',
  components: { CommandPalette, RegexBuilder, MaterialSidebar: Sidebar },
  props: {
    sections: { type: Array, default: () => [] },
    paletteActions: { type: Array, default: () => [] },
    active: { type: String, default: '' },
    homeHref: { type: String, default: '/' },
    brand: { type: String, default: 'GitLab M3' },
    chromeOnly: { type: Boolean, default: false },
    initialTheme: { type: String, default: 'light' },
  },
  data() {
    return { query: '', regexOpen: false, paletteOpen: false, theme: this.initialTheme, regexMode: false, regexPattern: '', regexFlags: 'i' };
  },
  computed: {
    searchId() { return `material-shell-a-search-${this._uid}`; },
    corpus() { return this.sections.flatMap((section) => section.items.map((item) => item.label)); },
  },
  mounted() {
    this.onKeydown = (event) => {
      if (event.ctrlKey && event.shiftKey && !event.altKey && event.key.toLocaleLowerCase() === 'f') {
        event.preventDefault();
        this.paletteOpen = true;
      }
      if (event.key === 'Escape') {
        this.paletteOpen = false;
        this.regexOpen = false;
      }
    };
    window.addEventListener('keydown', this.onKeydown);
  },
  beforeDestroy() { window.removeEventListener('keydown', this.onKeydown); },
  methods: {
    submitSearch(event) { this.$emit('search', this.query, event); },
    applyRegex({ pattern, flags }) { this.regexMode = true; this.regexPattern = pattern; this.regexFlags = flags; this.query = pattern; this.regexOpen = false; this.$emit('regex-change', { pattern, flags }); },
    toggleTheme() { this.theme = this.theme === 'dark' ? 'light' : 'dark'; this.$emit('theme-change', this.theme); },
    focusSearch() { this.$refs.search?.focus(); },
  },
};
</script>

<style lang="scss" src="../shared-shell.scss"></style>
