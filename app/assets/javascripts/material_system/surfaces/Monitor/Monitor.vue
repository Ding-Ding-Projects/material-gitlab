<template>
  <section class="material-live-surface dp-surface" data-surface-id="surface.monitor" :data-theme="dark ? 'dark' : 'light'">
    <header class="material-live-surface__topbar">
      <label class="material-live-surface__search">Search monitoring resources <input v-model="query" :aria-invalid="searchError ? 'true' : null" /></label>
      <button type="button" :aria-pressed="regexMode" @click="regexMode = !regexMode">Regex</button>
      <button type="button" :aria-expanded="regexOpen" @click="regexOpen = !regexOpen">Regex builder</button>
      <button type="button" @click="paletteOpen = true">Command palette</button>
      <button type="button" @click="toggleTheme">{{ dark ? 'Light theme' : 'Dark theme' }}</button>
      <a v-if="endpoints.settingsPath" :href="endpoints.settingsPath">Configure alerts</a>
      <RegexBuilderPopover v-if="regexOpen" :initial-pattern="query" :corpus="rows.map((row) => row.name)" @apply="applyRegex" @close="regexOpen = false" />
    </header>
    <div class="material-live-surface__heading">
      <h1>Monitor</h1>
      <nav class="material-live-surface__tabs" aria-label="Monitor sections">
        <button v-for="tab in tabs" :key="tab" type="button" :aria-current="activeTab === tab ? 'page' : null" :aria-selected="activeTab === tab" @click="selectTab(tab)">{{ tab }}</button>
      </nav>
      <a v-if="activeTab === 'Incidents' && endpoints.newIncident" :href="endpoints.newIncident">New incident</a>
      <a v-if="activeTab === 'On-call' && endpoints.oncallPath" :href="endpoints.oncallPath">Manage schedules and rotations</a>
    </div>
    <p v-if="searchError" role="alert">{{ searchError }}</p>
    <p v-if="loading" role="status">Loading live monitoring data…</p>
    <p v-else-if="error" role="alert">{{ error }} <button type="button" @click="load">Retry</button></p>
    <main v-else class="material-live-surface__main">
      <p v-if="notice" role="status">{{ notice }}</p>
      <div class="material-live-surface__card">
        <div v-for="row in rows" :key="row.id" class="material-live-surface__row">
          <div class="material-live-surface__row-copy"><a v-if="row.href" :href="row.href">{{ row.name }}</a><strong v-else>{{ row.name }}</strong><small>{{ row.sub }}</small></div>
          <span class="material-live-surface__badge">{{ row.status }} {{ row.severity }}</span>
          <span class="material-live-surface__meta">{{ row.when }}</span>
          <button v-if="actionLabel(row)" type="button" :disabled="busy" @click="confirmation = row">{{ actionLabel(row) }}</button>
        </div>
        <p v-if="!rows.length" class="material-live-surface__empty">No matching resources.</p>
      </div>
    </main>
    <CommandPalette v-if="paletteOpen" :actions="paletteActions" @close="paletteOpen = false" />
    <ConfirmDialog v-if="confirmation" :title="actionLabel(confirmation) + ' ' + confirmation.name + '?'" message="This changes the live resource state for this project." confirm-label="Confirm" @confirm="confirmChange" @cancel="confirmation = null" />
  </section>
</template>
<script>
import CommandPalette from '../Deploy/components/CommandPalette.vue';
import RegexBuilderPopover from '../Deploy/components/RegexBuilderPopover.vue';
import ConfirmDialog from '../Deploy/components/ConfirmDialog.vue';
import { loadSettings, updateSettings } from '../../settings';
import { TABS, TAB_COLLECTION_KEY, fetchMonitorTab, changeMonitorStatus } from './data';
export default {
  name: 'MonitorSurface', components: { ConfirmDialog, CommandPalette, RegexBuilderPopover },
  props: { endpoints: { type: Object, default: () => ({}) }, fetchImpl: { type: Function, default: undefined } },
  data() { return { live: [], activeTab: 'Alerts', loading: true, paletteOpen: false, regexOpen: false, error: '', query: '', regexMode: false, dark: loadSettings().theme === 'dark', notice: '', busy: false, confirmation: null, requestId: 0 }; },
  computed: {
    paletteActions() { return this.tabs.map((tab) => ({ label: 'Monitor: ' + tab, icon: 'monitor', run: () => this.selectTab(tab) })); },
    tabs() { return TABS.filter((tab) => this.endpoints[TAB_COLLECTION_KEY[tab]]); },
    searchError() { if (!this.regexMode || !this.query) return ''; try { new RegExp(this.query, 'i'); return ''; } catch (_error) { return 'Enter a valid regular expression.'; } },
    rows() { if (this.searchError) return []; const expression = this.regexMode ? new RegExp(this.query, 'i') : null; return this.live.filter((row) => expression ? expression.test(row.name) : row.name.toLowerCase().includes(this.query.toLowerCase())); },
  },
  created() { this.load(); },
  mounted() { this.onKeydown = (event) => { if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key.toLowerCase() === 'f') { event.preventDefault(); this.paletteOpen = true; } }; window.addEventListener('keydown', this.onKeydown); },
  beforeDestroy() { window.removeEventListener('keydown', this.onKeydown); },
  methods: {
    applyRegex(pattern) { this.query = pattern; this.regexMode = true; this.regexOpen = false; },
    async load() {
      const requestId = ++this.requestId; this.loading = true; this.error = '';
      try { const rows = await fetchMonitorTab(TAB_COLLECTION_KEY[this.activeTab], { endpoints: this.endpoints, fetchImpl: this.fetchImpl }); if (requestId === this.requestId) this.live = rows; }
      catch (error) { if (requestId === this.requestId) this.error = error.message; }
      finally { if (requestId === this.requestId) this.loading = false; }
    },
    selectTab(tab) { this.activeTab = tab; this.notice = ''; this.load(); },
    toggleTheme() { this.dark = !this.dark; updateSettings({ theme: this.dark ? 'dark' : 'light' }); },
    actionLabel(row) {
      if (row.kind === 'alerts' && this.endpoints.updateAlert) return row.status === 'resolved' ? 'Reopen' : row.status === 'triggered' ? 'Acknowledge' : 'Resolve';
      if (['incidents', 'tickets'].includes(row.kind) && this.endpoints.updateIssue) return row.status === 'closed' ? 'Reopen' : 'Close';
      return '';
    },
    async confirmChange() {
      const row = this.confirmation; this.confirmation = null; this.busy = true;
      try { await changeMonitorStatus(row, this.endpoints, { fetchImpl: this.fetchImpl }); this.notice = 'The server accepted the state transition.'; }
      catch (error) { this.notice = error.message; }
      finally { this.busy = false; await this.load(); }
    },
  },
};
</script>

<style lang="scss" src="../Deploy/deploy.scss"></style>
<style lang="scss" src="../operations.scss"></style>
