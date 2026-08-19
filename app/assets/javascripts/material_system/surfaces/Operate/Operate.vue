<template>
  <LiveCollectionSurface
    surface-id="surface.operate"
    title="Operate"
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
import { OPERATE_TABS, fetchOperateData, buildEnvironmentRows, buildClusterRows, buildTerraformRows } from './data';
export default {
  name: 'OperateSurface', components: { LiveCollectionSurface },
  props: { endpoints: { type: Object, default: () => ({}) }, fetchImpl: { type: Function, default: undefined } },
  data() { const settings = loadSettings(); return { tabs: OPERATE_TABS, live: { environments: [], clusters: [], terraform: [] }, loading: Boolean(Object.keys(this.endpoints).length), error: '', dark: settings.theme === 'dark' }; },
  computed: { rowsByTab() { return { environments: buildEnvironmentRows(this.live.environments), kubernetes: buildClusterRows(this.live.clusters), terraform: buildTerraformRows(this.live.terraform) }; } },
  created() { if (this.loading) this.load(); },
  methods: { async load() { this.loading = true; this.error = ''; try { this.live = await fetchOperateData({ endpoints: this.endpoints, fetchImpl: this.fetchImpl }); } catch (error) { this.error = error.message; } finally { this.loading = false; } }, toggleTheme() { this.dark = !this.dark; updateSettings({ theme: this.dark ? 'dark' : 'light' }); } },
};
</script>
