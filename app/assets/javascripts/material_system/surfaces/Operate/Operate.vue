<template>
  <section class="material-live-surface dp-surface" data-surface-id="surface.operate" :data-theme="dark ? 'dark' : 'light'">
    <header class="material-live-surface__topbar">
      <label class="material-live-surface__search">Search environments, agents and states <input v-model="query" :aria-invalid="searchError ? 'true' : null" /></label>
      <button type="button" :aria-pressed="regexMode" @click="regexMode = !regexMode">Regex</button>
      <button type="button" :aria-expanded="regexOpen" @click="regexOpen = !regexOpen">Regex builder</button>
      <button type="button" @click="paletteOpen = true">Command palette</button>
      <button type="button" @click="toggleTheme">{{ dark ? 'Light theme' : 'Dark theme' }}</button>
      <RegexBuilderPopover v-if="regexOpen" :initial-pattern="query" :corpus="rows.map((row) => row.name)" @apply="applyRegex" @close="regexOpen = false" />
    </header>
    <div class="material-live-surface__heading">
      <h1>Operate</h1>
      <nav class="material-live-surface__tabs" aria-label="Operate sections">
        <button v-for="tab in tabs" :key="tab.id" type="button" :aria-current="activeTab === tab.id ? 'page' : null" :aria-selected="activeTab === tab.id" @click="activeTab = tab.id">{{ tab.label }}</button>
      </nav>
      <a v-if="managementPath" :href="managementPath">{{ activeTab === 'environments' ? 'New environment' : 'Manage ' + activeTab }}</a>
    </div>
    <p v-if="searchError" role="alert">{{ searchError }}</p>
    <p v-if="loading" role="status">Loading live operations data…</p>
    <p v-else-if="error" role="alert">{{ error }} <button type="button" @click="load">Retry</button></p>
    <main v-else class="material-live-surface__main">
      <p v-if="notice" role="status">{{ notice }}</p>
      <div class="material-live-surface__card">
        <div v-for="row in rows" :key="row.id" class="material-live-surface__row">
          <div class="material-live-surface__row-copy">
            <a v-if="row.href" :href="row.href">{{ row.name }}</a><strong v-else>{{ row.name }}</strong>
            <small>{{ row.version || row.detail || '' }}{{ row.lockedBy ? ' · Locked by ' + row.lockedBy : '' }}</small>
          </div>
          <span class="material-live-surface__badge">{{ row.status }}</span>
          <span class="material-live-surface__meta">{{ row.updatedAt }}</span>
          <button v-if="row.stopPath" type="button" :disabled="busy" @click="requestChange(row, 'stop')">Stop</button>
          <button v-if="activeTab === 'terraform' && endpoints.terraformAdmin" type="button" :disabled="busy" @click="requestChange(row, 'lock')">{{ row.status === 'locked' ? 'Force unlock' : 'Lock' }}</button>
        </div>
        <p v-if="!rows.length" class="material-live-surface__empty">No matching resources.</p>
      </div>
    </main>
    <CommandPalette v-if="paletteOpen" :actions="paletteActions" @close="paletteOpen = false" />
    <ConfirmDialog v-if="confirmation" :title="confirmation.title" :message="confirmation.message" confirm-label="Confirm" @confirm="confirmChange" @cancel="confirmation = null" />
  </section>
</template>
<script>
import CommandPalette from '../Deploy/components/CommandPalette.vue';
import RegexBuilderPopover from '../Deploy/components/RegexBuilderPopover.vue';
import '../Deploy/deploy.scss';
import ConfirmDialog from '../Deploy/components/ConfirmDialog.vue';
import { loadSettings, updateSettings } from '../../settings';
import { OPERATE_TABS, fetchOperateData, stopEnvironment, changeStateLock } from './data';
export default {
  name: 'OperateSurface',
  components: { ConfirmDialog, CommandPalette, RegexBuilderPopover },
  props: { endpoints: { type: Object, default: () => ({}) }, fetchImpl: { type: Function, default: undefined } },
  data() { return { live: { environments: [], clusters: [], terraform: [] }, activeTab: 'environments', query: '', regexMode: false, loading: true, paletteOpen: false, regexOpen: false, error: '', notice: '', busy: false, confirmation: null, dark: loadSettings().theme === 'dark' }; },
  computed: {
    paletteActions() { return this.tabs.map((tab) => ({ label: 'Operate: ' + tab.label, icon: 'cloud', run: () => { this.activeTab = tab.id; } })); },
    tabs() { return OPERATE_TABS.filter((tab) => this.endpoints[tab.id]); },
    managementPath() { return this.endpoints[{ environments: 'newEnvironment', kubernetes: 'clustersPath', terraform: 'terraformPath' }[this.activeTab]]; },
    searchError() { if (!this.regexMode || !this.query) return ''; try { new RegExp(this.query, 'i'); return ''; } catch (_error) { return 'Enter a valid regular expression.'; } },
    rows() {
      const rows = this.live[this.activeTab === 'kubernetes' ? 'clusters' : this.activeTab] || [];
      if (this.searchError) return [];
      const expression = this.regexMode ? new RegExp(this.query, 'i') : null;
      return rows.filter((row) => expression ? expression.test(row.name) : row.name.toLowerCase().includes(this.query.toLowerCase()));
    },
  },
  created() { this.load(); },
  mounted() { this.onKeydown = (event) => { if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key.toLowerCase() === 'f') { event.preventDefault(); this.paletteOpen = true; } }; window.addEventListener('keydown', this.onKeydown); },
  beforeDestroy() { window.removeEventListener('keydown', this.onKeydown); },
  methods: {
    applyRegex(pattern) { this.query = pattern; this.regexMode = true; this.regexOpen = false; },
    async load() { this.loading = true; this.error = ''; try { this.live = await fetchOperateData({ endpoints: this.endpoints, fetchImpl: this.fetchImpl }); } catch (error) { this.error = error.message; } finally { this.loading = false; } },
    toggleTheme() { this.dark = !this.dark; updateSettings({ theme: this.dark ? 'dark' : 'light' }); },
    requestChange(row, kind) { this.confirmation = { row, kind, title: kind === 'stop' ? `Stop ${row.name}?` : `Change lock on ${row.name}?`, message: kind === 'stop' ? 'Run the configured stop action for this environment.' : 'Changing a live Terraform lock may affect an active deployment. Confirm only after coordinating with its owner.' }; },
    async confirmChange() {
      const { row, kind } = this.confirmation;
      this.confirmation = null; this.busy = true; this.notice = '';
      try {
        if (kind === 'stop') await stopEnvironment(row, { fetchImpl: this.fetchImpl });
        else await changeStateLock(this.endpoints, row, { fetchImpl: this.fetchImpl });
        this.notice = 'The server accepted the operation. The resource list has been refreshed.';
      } catch (error) { this.notice = error.message; }
      finally { this.busy = false; await this.load(); }
    },
  },
};
</script>
