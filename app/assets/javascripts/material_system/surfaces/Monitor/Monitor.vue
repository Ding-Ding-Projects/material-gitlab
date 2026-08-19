<template>
  <LiveCollectionSurface
    surface-id="surface.monitor"
    title="Monitor"
    :tabs="tabs"
    :rows-by-tab="rowsByTab"
    :loading="loading"
    :error="error"
    :dark="dark"
    @retry="load"
    @toggle-theme="toggleTheme"
  />
</template>
<script>
import LiveCollectionSurface from '../LiveCollectionSurface.vue';
import { loadSettings, updateSettings } from '../../settings';
import { TABS, TAB_COLLECTION_KEY, fetchMonitorData, buildRow } from './data';
export default {
  name: 'MonitorSurface', components: { LiveCollectionSurface },
  props: { endpoints: { type: Object, default: () => ({}) }, fetchImpl: { type: Function, default: undefined } },
  data() { const settings = loadSettings(); return { tabs: TABS, live: { incidents: [], alerts: [], errors: [], oncall: [], tickets: [] }, loading: Boolean(Object.keys(this.endpoints).length), error: '', dark: settings.theme === 'dark' }; },
  computed: { rowsByTab() { return Object.fromEntries(this.tabs.map((tab) => [tab, (this.live[TAB_COLLECTION_KEY[tab]] || []).map((row) => buildRow(tab, row))])); } },
  created() { if (this.loading) this.load(); },
  methods: { async load() { this.loading = true; this.error = ''; try { this.live = await fetchMonitorData({ endpoints: this.endpoints, fetchImpl: this.fetchImpl }); } catch (error) { this.error = error.message; } finally { this.loading = false; } }, toggleTheme() { this.dark = !this.dark; updateSettings({ theme: this.dark ? 'dark' : 'light' }); } },
};
</script>
