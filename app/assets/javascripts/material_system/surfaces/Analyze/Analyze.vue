<template>
  <div class="material-analyze" :data-theme="theme">
    <header class="material-analyze__topbar">
      <div class="material-analyze__search-wrap">
        <label class="sr-only" :for="searchId">Filter analytics</label>
        <input :id="searchId" ref="search" v-model="query" type="search" :placeholder="regexMode ? 'Regex filter — chart rows' : 'Filter chart rows'" @keydown.enter="emitFilter" />
        <button type="button" aria-label="Open regex builder for analytics filter" @click="regexOpen = true">.*</button>
      </div>
      <button type="button" aria-label="Open command palette (Ctrl+Shift+F)" @click="paletteOpen = true">⌘</button>
      <button type="button" aria-label="Toggle theme" @click="toggleTheme">{{ theme === 'dark' ? '☀' : '☾' }}</button>
    </header>
    <div class="material-analyze__heading">
      <h1>Analyze</h1>
      <div class="material-analyze__tabs" role="tablist" aria-label="Analytics views">
        <button v-for="tab in tabs" :key="tab.id || tab.label" type="button" role="tab" :aria-selected="tab.key === activeTab || tab.id === activeTab" :class="{ 'is-active': tab.key === activeTab || tab.id === activeTab }" @click="selectTab(tab.key || tab.id)">{{ tab.label }}</button>
      </div>
    </div>
    <main class="material-analyze__content">
      <div v-if="!activeData" class="material-analyze__empty" role="status">Analytics data is unavailable for this view.</div>
      <template v-else>
        <div class="material-analyze__stats">
          <article v-for="stat in activeData.stats" :key="stat.id || stat.label" class="material-analyze__stat">
            <strong>{{ stat.value }}</strong><span>{{ stat.label }}</span><small :class="`is-${stat.tone || 'neutral'}`">{{ stat.trend }}</small>
          </article>
        </div>
        <section class="material-analyze__chart" aria-labelledby="analyze-chart-title">
          <h2 id="analyze-chart-title">{{ activeData.chartTitle }}</h2>
          <div v-for="bar in visibleBars" :key="bar.id || bar.label" class="material-analyze__bar-row">
            <span>{{ bar.label }}</span><div class="material-analyze__bar-track"><div class="material-analyze__bar" :style="{ width: `${Math.max(0, Math.min(100, Number(bar.percent) || 0))}%` }"><b>{{ bar.value }}</b></div></div>
          </div>
          <div v-if="!visibleBars.length" class="material-analyze__empty" role="status">Nothing matches.</div>
        </section>
      </template>
    </main>
    <regex-builder v-if="regexOpen" :initial="query" :corpus="corpus" target-label="analytics filter" @apply="applyRegex" @close="regexOpen = false" />
    <command-palette v-if="paletteOpen" :actions="paletteActions" @close="paletteOpen = false" />
  </div>
</template>

<script>
import CommandPalette from '../CommandPalette/CommandPalette.vue';
import RegexBuilder from '../RegexBuilder/RegexBuilder.vue';

export function createAnalyzeDataAdapter(payload) {
  if (!payload || typeof payload !== 'object') return { tabs: [], views: {} };
  const views = payload.views || payload.dashboards || {};
  const tabs = payload.tabs || Object.keys(views).map((id) => ({ id, label: views[id]?.label || id }));
  return { tabs, views };
}

export default {
  name: 'MaterialAnalyze',
  components: { CommandPalette, RegexBuilder },
  props: { dataAdapter: { type: Object, default: () => ({ tabs: [], views: {} }) }, initialTab: { type: String, default: '' }, paletteActions: { type: Array, default: () => [] }, initialTheme: { type: String, default: 'light' } },
  data() { const tabs = this.dataAdapter.tabs || []; return { query: '', regexOpen: false, regexMode: false, regexPattern: '', regexFlags: 'i', paletteOpen: false, theme: this.initialTheme, activeTab: this.initialTab || tabs[0]?.key || tabs[0]?.id || '' }; },
  computed: {
    searchId() { return `material-analyze-search-${this._uid}`; },
    tabs() { return this.dataAdapter.tabs || []; },
    activeData() { return this.dataAdapter.views?.[this.activeTab] || null; },
    corpus() { return Object.values(this.dataAdapter.views || {}).flatMap((view) => (view.bars || []).map((bar) => bar.label)); },
    visibleBars() {
      const bars = this.activeData?.bars || [];
      if (!this.query) return bars;
      if (this.regexMode) { try { const expression = new RegExp(this.regexPattern || this.query, this.regexFlags.replace(/[gy]/g, '')); return bars.filter((bar) => expression.test(bar.label)); } catch (_error) { return []; } }
      const query = this.query.toLocaleLowerCase(); return bars.filter((bar) => bar.label.toLocaleLowerCase().includes(query));
    },
  },
  mounted() {
    this.onKeydown = (event) => { if (event.ctrlKey && event.shiftKey && !event.altKey && event.key.toLocaleLowerCase() === 'f') { event.preventDefault(); this.paletteOpen = true; } if (event.key === 'Escape') { this.paletteOpen = false; this.regexOpen = false; } };
    window.addEventListener('keydown', this.onKeydown);
  },
  beforeDestroy() { window.removeEventListener('keydown', this.onKeydown); },
  methods: {
    selectTab(tab) { this.activeTab = tab; this.$emit('tab-change', tab); },
    emitFilter() { this.$emit('filter-change', { query: this.query, regex: this.regexMode, pattern: this.regexPattern, flags: this.regexFlags }); },
    applyRegex({ pattern, flags }) { this.query = pattern; this.regexPattern = pattern; this.regexFlags = flags || 'i'; this.regexMode = true; this.regexOpen = false; this.emitFilter(); },
    toggleTheme() { this.theme = this.theme === 'dark' ? 'light' : 'dark'; this.$emit('theme-change', this.theme); },
  },
};
</script>

<style lang="scss" src="../shared-shell.scss"></style>
