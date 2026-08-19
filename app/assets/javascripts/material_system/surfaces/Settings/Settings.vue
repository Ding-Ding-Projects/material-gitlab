<template>
  <div class="st-surface" :data-st-theme="themeAttr">
    <TopBar :dark="dark" :user-name="userName" :user-initials="userInitials" @toggle-theme="toggleTheme" @open-palette="paletteOpen = true" />

    <TabStrip :tabs="tabs" :active="tab" @select="selectTab" />

    <main class="st-main">
      <div v-if="loading || adapterError || adapterErrors.length" class="st-adapter-status" :class="{ 'st-adapter-status--error': adapterError || adapterErrors.length }" role="status">
        <strong v-if="loading">Loading project settings…</strong>
        <strong v-else-if="adapterError">Settings unavailable</strong>
        <strong v-else>Settings reported an error</strong>
        <span v-if="adapterError">{{ adapterError }}</span>
        <span v-for="error in adapterErrors" :key="error">{{ error }}</span>
      </div>
      <GeneralTab
        v-show="tab === 'general'"
        :project-name="projectNameDraft"
        :visibility="visibility"
        :logo-color="logoColor"
        :logo-letter="logoLetter"
        :logo-file-name="logoFileName"
        :vocabulary-status="vocabularyStatus"
        :vocabulary-ok="vocabularyOk"
        :converter-status="converterStatus"
        @update:project-name="onProjectNameChange"
        @update:visibility="onVisibilityChange"
        @update:logo-color="onLogoColorChange"
        @upload-logo="onLogoUpload"
        @vocabulary-loaded="onVocabularyLoaded"
        @file-chosen="onFileConverted"
      />

      <MembersTab
        v-show="tab === 'members'"
        ref="membersTab"
        :members="members"
        @set-role="onSetRole"
        @remove-members="onRemoveMembers"
      />

      <CicdTab
        v-show="tab === 'cicd'"
        ref="cicdTab"
        :variables="variables"
        :protected-branches="protectedBranches"
        @add-variable="onAddVariable"
        @toggle-reveal="onToggleReveal"
        @remove-variables="onRemoveVariables"
        @unprotect-branches="onUnprotectBranches"
      />

      <IntegrationsTab
        v-show="tab === 'integrations'"
        ref="integrationsTab"
        :integrations="integrations"
        @toggle="onToggleIntegration"
        @bulk-toggle="onBulkToggleIntegrations"
      />
    </main>

    <CommandPalette v-if="paletteOpen" :actions="paletteActions" @close="paletteOpen = false" />
  </div>
</template>

<script>
import TopBar from './components/TopBar.vue';
import TabStrip from './components/TabStrip.vue';
import GeneralTab from './components/GeneralTab.vue';
import MembersTab from './components/MembersTab.vue';
import CicdTab from './components/CicdTab.vue';
import IntegrationsTab from './components/IntegrationsTab.vue';
import CommandPalette from './components/CommandPalette.vue';
import { loadSettings, updateSettings, subscribeSettings } from '../../settings';
import notificationCenter from '../../notifications';
import {
  TABS,
  createInitialState,
  logoLetterFor,
} from './data';
import {
  SETTINGS_ADAPTER_ERROR,
  assertSettingsAdapter,
  isSettingsAdapter,
  normalizeSettingsState,
} from './adapter';

export default {
  name: 'Settings',
  components: { TopBar, TabStrip, GeneralTab, MembersTab, CicdTab, IntegrationsTab, CommandPalette },
  props: {
    userName: { type: String, default: '' },
    userInitials: { type: String, default: '' },
    // Production state and mutations must come from a real host adapter.
    adapter: { type: Object, default: null },
    // Compatibility alias for callers that named this seam explicitly.
    settingsAdapter: { type: Object, default: null },
    notifications: { type: Object, default: () => notificationCenter },
  },
  data() {
    return {
      ...createInitialState(),
      projectNameDraft: '',
      tabs: TABS,
      paletteOpen: false,
      theme: loadSettings().theme,
      loading: false,
      adapterReady: false,
      adapterError: SETTINGS_ADAPTER_ERROR,
      adapterErrors: [],
    };
  },
  computed: {
    effectiveAdapter() {
      return this.adapter || this.settingsAdapter;
    },
    dark() {
      if (this.theme === 'dark') return true;
      if (this.theme === 'light') return false;
      return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    },
    themeAttr() {
      return this.theme === 'light' || this.theme === 'dark' ? this.theme : undefined;
    },
    logoLetter() {
      return logoLetterFor(this.projectName);
    },
    paletteActions() {
      return [
        {
          id: 'toggle-theme',
          icon: this.dark ? 'sun' : 'moon',
          label: this.dark ? 'Switch to light theme' : 'Switch to dark theme',
          run: () => this.toggleTheme(),
        },
        ...this.tabs.map((tabDef) => ({
          id: `tab-${tabDef.id}`,
          icon: 'settings',
          label: `Settings: ${tabDef.label}`,
          run: () => this.selectTab(tabDef.id),
        })),
      ];
    },
  },
  watch: {
    adapter() {
      this.refreshAdapter();
    },
    settingsAdapter() {
      this.refreshAdapter();
    },
  },
  created() {
    this.refreshAdapter();
    this.unsubscribeSettings = subscribeSettings((settings) => {
      this.theme = settings.theme;
    });
    this.onKeydown = (event) => {
      if (event.ctrlKey && event.shiftKey && (event.key === 'F' || event.key === 'f')) {
        event.preventDefault();
        this.paletteOpen = true;
      } else if (event.key === 'Escape') {
        this.paletteOpen = false;
      }
    };
    window.addEventListener('keydown', this.onKeydown);
  },
  beforeDestroy() {
    if (this.unsubscribeSettings) this.unsubscribeSettings();
    window.removeEventListener('keydown', this.onKeydown);
  },
  methods: {
    applyAdapterState(snapshot) {
      const normalized = normalizeSettingsState(snapshot);
      const fields = ['projectName', 'visibility', 'logoColor', 'logoFileName', 'members', 'variables', 'protectedBranches', 'integrations', 'permissions'];
      fields.forEach((field) => {
        if (Object.prototype.hasOwnProperty.call(snapshot || {}, field)
          || (field === 'projectName' && snapshot?.project?.name != null)
          || (field === 'visibility' && snapshot?.project?.visibility != null)) {
          this[field] = normalized[field];
        }
      });
      if (Object.prototype.hasOwnProperty.call(snapshot || {}, 'projectName') || snapshot?.project?.name != null) {
        this.projectNameDraft = this.projectName;
      }
      this.adapterErrors = normalized.errors;
    },
    async refreshAdapter() {
      if (!isSettingsAdapter(this.effectiveAdapter)) {
        this.loading = false;
        this.adapterReady = false;
        this.adapterError = SETTINGS_ADAPTER_ERROR;
        return;
      }
      this.loading = true;
      try {
        assertSettingsAdapter(this.effectiveAdapter);
        const snapshot = await this.effectiveAdapter.load();
        this.applyAdapterState(snapshot || {});
        this.adapterReady = true;
        this.adapterError = '';
      } catch (error) {
        this.adapterReady = false;
        this.adapterError = error?.message || 'The settings adapter could not load project data.';
      } finally {
        this.loading = false;
      }
    },
    async runAdapter(method, payload) {
      if (!this.adapterReady || !isSettingsAdapter(this.effectiveAdapter)) {
        this.adapterError = SETTINGS_ADAPTER_ERROR;
        return false;
      }
      try {
        assertSettingsAdapter(this.effectiveAdapter);
        const snapshot = await this.effectiveAdapter[method](payload);
        if (snapshot) this.applyAdapterState(snapshot);
        this.adapterError = '';
        return true;
      } catch (error) {
        this.adapterError = error?.message || `Settings action ${method} failed.`;
        this.notifications.notify({ title: 'Settings update failed', message: this.adapterError, severity: 'error' });
        return false;
      }
    },
    selectTab(id) {
      this.tab = id;
    },
    toggleTheme() {
      const next = this.dark ? 'light' : 'dark';
      this.theme = next;
      updateSettings({ theme: next });
    },
    onProjectNameChange(value) {
      this.projectNameDraft = value;
      this.runAdapter('updateProject', { name: value }).then((ok) => {
        if (ok) this.projectName = value;
        else this.projectNameDraft = this.projectName;
      });
    },
    onVisibilityChange(value) {
      this.runAdapter('updateProject', { visibility: value }).then((ok) => {
        if (ok) {
          this.visibility = value;
          this.notifications.notify({ title: 'Visibility updated', message: `Project is now ${value}.`, severity: 'info' });
        }
      });
    },
    onLogoColorChange(color) {
      this.runAdapter('updateProject', { logoColor: color }).then((ok) => {
        if (ok) this.logoColor = color;
      });
    },
    onLogoUpload(file) {
      this.runAdapter('updateLogo', file).then((ok) => {
        if (ok) {
          this.logoFileName = file.name;
          this.notifications.notify({ title: 'Logo uploaded', message: `${file.name} was accepted by the project settings adapter.`, severity: 'success' });
        }
      });
    },
    onVocabularyLoaded({ ok, status }) {
      this.vocabularyOk = ok;
      this.vocabularyStatus = status;
      this.notifications.notify({ title: ok ? 'Vocabulary loaded' : 'Vocabulary rejected', message: status, severity: ok ? 'success' : 'error' });
    },
    onFileConverted(status) {
      this.converterStatus = status;
    },
    onSetRole({ id, role }) {
      this.runAdapter('updateMemberRole', { id, role }).then((ok) => {
        if (ok) this.notifications.notify({ title: 'Role updated', message: `Member role changed to ${role}.`, severity: 'info' });
      });
    },
    onRemoveMembers(ids) {
      this.runAdapter('removeMembers', ids).then((ok) => {
        if (ok) this.notifications.notify({ title: 'Member access removed', message: `${ids.length} member${ids.length === 1 ? '' : 's'} removed from this project.`, severity: 'warning' });
      });
    },
    onAddVariable() {
      this.runAdapter('createVariable', {}).then((ok) => {
        if (ok) this.notifications.notify({ title: 'Variable added', message: 'The server returned the new variable state.', severity: 'info' });
      });
    },
    onToggleReveal(id) {
      this.runAdapter('revealVariable', id);
    },
    onRemoveVariables(ids) {
      this.runAdapter('removeVariables', ids).then((ok) => {
        if (ok) this.notifications.notify({ title: 'Variable deleted', message: `${ids.length} variable${ids.length === 1 ? '' : 's'} removed.`, severity: 'warning' });
      });
    },
    onUnprotectBranches(ids) {
      this.runAdapter('unprotectBranches', ids).then((ok) => {
        if (ok) this.notifications.notify({ title: 'Branch unprotected', message: `${ids.length} branch${ids.length === 1 ? '' : 'es'} no longer protected.`, severity: 'warning' });
      });
    },
    onToggleIntegration(id) {
      const integration = this.integrations.find((item) => item.id === id);
      if (integration) this.runAdapter('toggleIntegration', { id, on: !integration.on });
    },
    onBulkToggleIntegrations({ ids, on }) {
      if (ids.length === 0) return;
      this.runAdapter('bulkToggleIntegrations', { ids, on }).then((ok) => {
        if (ok) this.notifications.notify({ title: on ? 'Integrations enabled' : 'Integrations disabled', message: `${ids.length} integration${ids.length === 1 ? '' : 's'} updated.`, severity: 'info' });
      });
    },
  },
};
</script>

<style lang="scss" src="./settings.scss"></style>
<style lang="scss" scoped>
.st-main {
  flex: 1;
  overflow-y: auto;
  padding: 8px 24px 24px;
  max-width: 860px;
  width: 100%;
}

.st-adapter-status {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin: 0 0 14px;
  padding: 12px 16px;
  border: 1px solid var(--st-outl);
  border-radius: var(--st-radius-field);
  background: var(--st-surfcl);
  color: var(--st-onsurfv);
  font-size: 13px;
}

.st-adapter-status--error {
  border-color: var(--st-err);
  background: var(--st-errc);
  color: var(--st-err);
}
</style>
