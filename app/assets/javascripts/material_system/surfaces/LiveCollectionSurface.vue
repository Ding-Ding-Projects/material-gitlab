<template>
  <section class="material-live-surface" :data-surface-id="surfaceId" :data-theme="dark ? 'dark' : 'light'">
    <header class="material-live-surface__topbar" data-screen-label="Top bar">
      <label class="material-live-surface__search">
        <span aria-hidden="true">⌕</span>
        <span class="sr-only">{{ searchLabel }}</span>
        <input v-model="query" :placeholder="regexMode ? `Regex search — ${activeTab}` : `Search ${activeTab}`" @keydown.esc="query = ''" />
        <button type="button" :aria-pressed="regexMode" title="Toggle regex mode" @click="regexMode = !regexMode">.*</button>
      </label>
      <button type="button" class="material-live-surface__icon" title="Command palette (Ctrl+Shift+F)" @click="paletteOpen = true">⌘</button>
      <button type="button" class="material-live-surface__icon" :title="dark ? 'Switch to light theme' : 'Switch to dark theme'" @click="$emit('toggle-theme')">{{ dark ? '☼' : '☾' }}</button>
      <span class="material-live-surface__avatar" aria-label="Current user">JD</span>
    </header>
    <div class="material-live-surface__heading">
      <h1>{{ title }}</h1>
      <nav class="material-live-surface__tabs" role="tablist" :aria-label="`${title} sections`">
        <button v-for="tab in tabs" :key="tab.id || tab" type="button" role="tab" :aria-selected="activeTab === (tab.id || tab)" @click="activeTab = tab.id || tab">
          {{ tab.label || tab }}
        </button>
      </nav>
    </div>
    <p v-if="loading" class="material-live-surface__state" role="status">Loading live {{ title.toLowerCase() }} data…</p>
    <p v-else-if="error" class="material-live-surface__state material-live-surface__state--error" role="alert">{{ error }} <button type="button" @click="$emit('retry')">Retry</button></p>
    <main v-else class="material-live-surface__main">
      <div class="material-live-surface__card" role="tabpanel">
        <button v-for="row in visibleRows" :key="row.id" type="button" class="material-live-surface__row" @click="$emit('row-action', row)">
          <span class="material-live-surface__row-icon" aria-hidden="true">{{ row.icon || '●' }}</span>
          <span class="material-live-surface__row-copy"><strong>{{ row.name || row.title }}</strong><small>{{ row.detail || row.sub }}</small></span>
          <span v-if="row.status || row.badge" class="material-live-surface__badge">{{ row.status || row.badge }}</span>
          <span class="material-live-surface__meta">{{ row.meta || row.when || '' }}</span>
          <span v-if="row.actionLabel || row.action" class="material-live-surface__action">{{ row.actionLabel || row.action }}</span>
        </button>
        <p v-if="!visibleRows.length" class="material-live-surface__empty">Nothing matches.</p>
      </div>
    </main>
    <div v-if="paletteOpen" class="material-live-surface__palette" role="dialog" aria-modal="true" aria-label="Command palette">
      <input ref="palette" v-model="paletteQuery" placeholder="Search commands" @keydown.esc="paletteOpen = false" />
      <button v-for="tab in tabs.filter((item) => String(item.label || item).toLowerCase().includes(paletteQuery.toLowerCase()))" :key="tab.id || tab" type="button" @click="activeTab = tab.id || tab; paletteOpen = false">{{ title }}: {{ tab.label || tab }}</button>
      <button type="button" @click="paletteOpen = false">Close</button>
    </div>
  </section>
</template>

<script>
export default {
  name: 'LiveCollectionSurface',
  props: {
    surfaceId: { type: String, required: true },
    title: { type: String, required: true },
    tabs: { type: Array, required: true },
    rowsByTab: { type: Object, required: true },
    loading: Boolean,
    error: { type: String, default: '' },
    dark: Boolean,
    searchLabel: { type: String, default: 'Search' },
  },
  data() {
    return { activeTab: this.tabs[0]?.id || this.tabs[0] || '', query: '', regexMode: false, paletteOpen: false, paletteQuery: '' };
  },
  computed: {
    rows() { return this.rowsByTab[this.activeTab] || []; },
    visibleRows() {
      if (!this.query) return this.rows;
      if (!this.regexMode) return this.rows.filter((row) => `${row.name || row.title} ${row.detail || row.sub || ''}`.toLowerCase().includes(this.query.toLowerCase()));
      try { const expression = new RegExp(this.query, 'i'); return this.rows.filter((row) => expression.test(`${row.name || row.title} ${row.detail || row.sub || ''}`)); } catch (_error) { return this.rows; }
    },
  },
  mounted() {
    this.onKeydown = (event) => { if (event.ctrlKey && event.shiftKey && event.key.toLowerCase() === 'f') { event.preventDefault(); this.paletteOpen = true; this.$nextTick(() => this.$refs.palette?.focus()); } };
    window.addEventListener('keydown', this.onKeydown);
  },
  beforeDestroy() { window.removeEventListener('keydown', this.onKeydown); },
};
</script>
