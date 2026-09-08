<template>
  <div class="material-analyze" :data-theme="theme" data-surface-id="surface.analyze" data-material-topbar-owner="surface.analyze">
    <header class="material-analyze__topbar">
      <div class="material-analyze__search-wrap">
        <label class="sr-only" :for="searchId">Filter analytics</label>
        <material-text-field :id="searchId" ref="search" v-model="query" type="search" :aria-invalid="regexError ? 'true' : null" :placeholder="regexMode ? 'Regex filter: chart rows' : 'Filter chart rows'" />
        <material-icon-button type="button" :aria-pressed="regexMode" aria-label="Toggle regex filter" @click="regexMode = !regexMode">.*</material-icon-button>
        <material-text-button type="button" aria-label="Open regex builder for analytics filter" @click="regexOpen = true">Regex builder</material-text-button>
      </div>
      <material-icon-button type="button" aria-label="Open command palette (Ctrl+Shift+F)" @click="paletteOpen = true">⌘</material-icon-button>
      <material-icon-button type="button" aria-label="Toggle theme" @click="toggleTheme">{{ theme === 'dark' ? '☀' : '☾' }}</material-icon-button>
    </header>
    <div class="material-analyze__heading">
      <h1>Analyze</h1>
      <span>{{ endpoints.projectName }}</span>
      <div class="material-analyze__tabs" role="tablist" aria-label="Analytics views">
        <material-text-button v-for="tab in tabs" :key="tab.id || tab.label" type="button" role="tab" :aria-selected="tab.key === activeTab || tab.id === activeTab" :class="{ 'is-active': tab.key === activeTab || tab.id === activeTab }" @click="selectTab(tab.key || tab.id)">{{ tab.label }}</material-text-button>
      </div>
    </div>
    <form v-if="activeTab !== 'insights'" class="material-analyze__range" @submit.prevent="loadReport">
      <label>From (UTC) <material-text-field v-model="startDate" type="date" required /></label>
      <label>Through (UTC, inclusive) <material-text-field v-model="endDate" type="date" required /></label>
      <material-text-button type="submit" :disabled="loading">Apply dates</material-text-button>
      <span v-if="endpoints.ref && ['repository', 'contributors'].includes(activeTab)">Ref: {{ endpoints.ref }}</span>
    </form>
    <nav class="material-analyze__links" aria-label="Advanced analytics reports">
      <a v-if="advancedPath" :href="advancedPath">Open full {{ activeLabel }} report</a>
      <template v-if="activeTab === 'value-stream'">
        <a v-if="endpoints.valueStreamEdit" :href="endpoints.valueStreamEdit">Edit value stream</a>
        <a v-if="endpoints.valueStreamNew" :href="endpoints.valueStreamNew">New value stream</a>
      </template>
    </nav>
    <main class="material-analyze__content">
      <p v-if="regexError" role="alert">{{ regexError }}</p>
      <p v-if="loading" role="status">Loading live project analytics...</p>
      <p v-else-if="error" role="alert">{{ error }} <material-text-button type="button" @click="loadReport">Retry</material-text-button></p>
      <div v-else-if="!activeData" class="material-analyze__empty" role="status">Analytics data is unavailable for this view.</div>
      <template v-else>
        <p v-if="observedWindow">{{ observedWindow }}</p>
        <label v-if="activeData.choices && activeData.choices.length" class="material-analyze__insight-picker">Configured Insights chart
          <select v-model="chartId" @change="loadReport">
            <option v-for="choice in activeData.choices" :key="choice.id" :value="choice.id">{{ choice.label }}</option>
          </select>
        </label>
        <p v-if="activeData.message" role="status">{{ activeData.message }}</p>
        <div class="material-analyze__stats">
          <article v-for="stat in activeData.stats" :key="stat.id || stat.label" class="material-analyze__stat">
            <strong>{{ stat.value }}</strong><span>{{ stat.label }}</span><small>{{ stat.detail }}</small>
          </article>
        </div>
        <section class="material-analyze__chart" aria-labelledby="analyze-chart-title">
          <h2 id="analyze-chart-title">{{ activeData.chartTitle }}</h2>
          <p v-if="activeData.caption">{{ activeData.caption }}</p>
          <div v-for="(bar, index) in visibleBars" :key="bar.id || `${bar.label}:${index}`" class="material-analyze__bar-row" :title="bar.detail">
            <span>{{ bar.label }}</span>
            <div v-if="bar.percent !== null" class="material-analyze__bar-track" aria-hidden="true"><div class="material-analyze__bar" :style="{ width: `${bar.percent}%` }" /></div>
            <span class="material-analyze__bar-value">{{ bar.value }}</span>
          </div>
          <div v-if="!visibleBars.length && !activeData.message" class="material-analyze__empty" role="status">{{ query ? 'No chart rows match this filter.' : 'No chart observations are available for this report.' }}</div>
        </section>
      </template>
    </main>
    <regex-builder v-if="regexOpen" :initial="query" :corpus="corpus" target-label="analytics filter" @apply="applyRegex" @close="regexOpen = false" />
    <command-palette v-if="paletteOpen" :actions="commands" @close="paletteOpen = false" />
  </div>
</template>

<script>
import CommandPalette from '../CommandPalette/CommandPalette.vue';
import RegexBuilder from '../RegexBuilder/RegexBuilder.vue';
import { loadSettings, updateSettings, subscribeSettings } from '../../settings';
import MaterialIconButton from '../../components/material_icon_button';
import MaterialTextButton from '../../components/material_text_button';
import MaterialTextField from '../../components/material_text_field';

export function createAnalyzeDataAdapter(payload) {
  if (!payload || typeof payload !== 'object') return { tabs: [], views: {} };
  const views = payload.views || payload.dashboards || {};
  const tabs = payload.tabs || Object.keys(views).map((id) => ({ id, label: views[id]?.label || id }));
  return { tabs, views };
}

export default {
  name: 'MaterialAnalyze',
  components: { CommandPalette, RegexBuilder, MaterialIconButton, MaterialTextButton, MaterialTextField },
  props: { dataAdapter: { type: Object, default: () => ({ tabs: [], views: {} }) }, endpoints: { type: Object, default: () => ({}) }, initialTab: { type: String, default: '' }, paletteActions: { type: Array, default: () => [] }, initialTheme: { type: String, default: '' } },
  data() { const tabs = this.dataAdapter.tabs || []; return { query: '', regexOpen: false, regexMode: false, regexFlags: 'i', paletteOpen: false, theme: this.initialTheme || this.resolveTheme(), activeTab: this.initialTab || tabs[0]?.key || tabs[0]?.id || '', report: null, loading: false, error: this.endpoints.initialError || '', startDate: this.endpoints.startDate || '', endDate: this.endpoints.endDate || '', observedWindow: '', chartId: '', requestId: 0 }; },
  computed: {
    searchId() { return `material-analyze-search-${this._uid}`; },
    tabs() { return this.dataAdapter.tabs || []; },
    activeData() { return this.report || this.dataAdapter.views?.[this.activeTab] || null; },
    activeLabel() { return this.tabs.find((tab) => (tab.id || tab.key) === this.activeTab)?.label || ''; },
    advancedPath() { return this.endpoints.routes?.[this.activeTab] || ''; },
    corpus() { return (this.activeData?.bars || []).map((bar) => bar.label); },
    commands() { return [...this.paletteActions, { id: 'analyze-theme', label: 'Toggle theme', run: () => this.toggleTheme() }, ...this.tabs.map((tab) => ({ id: tab.id, label: `Analyze: ${tab.label}`, run: () => this.selectTab(tab.id || tab.key) }))]; },
    regexError() { if (!this.regexMode || !this.query) return ''; try { new RegExp(this.query, this.regexFlags.replace(/[gy]/g, '')); return ''; } catch (_error) { return 'Enter a valid regular expression to filter chart rows.'; } },
    visibleBars() {
      const bars = this.activeData?.bars || [];
      if (!this.query) return bars;
      if (this.regexMode) { if (this.regexError) return []; const expression = new RegExp(this.query, this.regexFlags.replace(/[gy]/g, '')); return bars.filter((bar) => expression.test(bar.label)); }
      const query = this.query.toLocaleLowerCase(); return bars.filter((bar) => bar.label.toLocaleLowerCase().includes(query));
    },
  },
  mounted() {
    if (!this.error) this.loadReport();
    this.unsubscribeSettings = subscribeSettings(() => { this.theme = this.resolveTheme(); });
    this.media = window.matchMedia?.('(prefers-color-scheme: dark)');
    this.onMedia = () => { this.theme = this.resolveTheme(); };
    this.media?.addEventListener?.('change', this.onMedia);
    this.onKeydown = (event) => { if (event.ctrlKey && event.shiftKey && !event.altKey && event.key.toLocaleLowerCase() === 'f') { event.preventDefault(); this.paletteOpen = true; } if (event.key === 'Escape') { this.paletteOpen = false; this.regexOpen = false; } };
    window.addEventListener('keydown', this.onKeydown);
  },
  beforeDestroy() { window.removeEventListener('keydown', this.onKeydown); this.unsubscribeSettings?.(); this.media?.removeEventListener?.('change', this.onMedia); this.requestId += 1; },
  methods: {
    resolveTheme() { const theme = loadSettings().theme; return theme === 'system' ? (window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light') : theme; },
    selectTab(tab) { this.activeTab = tab; this.report = null; this.chartId = ''; this.$emit('tab-change', tab); this.loadReport(); },
    async loadReport() {
      if (typeof this.dataAdapter.load !== 'function') return;
      const requestId = ++this.requestId; this.loading = true; this.error = '';
      const bounds = { startDate: this.startDate, endDate: this.endDate, chartId: this.chartId };
      const tab = this.activeTab;
      try {
        const report = await this.dataAdapter.load(tab, bounds);
        if (requestId !== this.requestId) return;
        this.report = report; this.chartId = report.selectedChart || this.chartId;
        this.observedWindow = tab === 'insights' ? 'Saved Insights configuration controls the reporting window.' : `Observation window: ${bounds.startDate} 00:00:00 through ${bounds.endDate} 23:59:59.999 UTC.`;
      } catch (error) { if (requestId === this.requestId) { this.error = error.message; this.report = null; } }
      finally { if (requestId === this.requestId) this.loading = false; }
    },
    applyRegex({ pattern, flags }) { this.query = pattern; this.regexFlags = flags || 'i'; this.regexMode = true; this.regexOpen = false; },
    toggleTheme() { const theme = this.theme === 'dark' ? 'light' : 'dark'; const result = updateSettings({ theme }); if (result.ok) this.theme = theme; this.$emit('theme-change', theme); },
  },
};
</script>

<style lang="scss" src="../shared-shell.scss"></style>
<style lang="scss" src="./analyze.scss"></style>
