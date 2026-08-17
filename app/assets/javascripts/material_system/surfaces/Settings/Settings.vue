<template>
  <div class="st-surface" :data-st-theme="themeAttr">
    <TopBar :dark="dark" :user-name="userName" :user-initials="userInitials" @toggle-theme="toggleTheme" @open-palette="paletteOpen = true" />

    <TabStrip :tabs="tabs" :active="tab" @select="selectTab" />

    <main class="st-main">
      <GeneralTab
        v-show="tab === 'general'"
        :project-name="projectName"
        :visibility="visibility"
        :logo-color="logoColor"
        :logo-letter="logoLetter"
        :logo-file-name="logoFileName"
        :vocabulary-status="vocabularyStatus"
        :vocabulary-ok="vocabularyOk"
        :converter-status="converterStatus"
        @update:project-name="projectName = $event"
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
  withRole,
  withoutIds,
  withToggledReveal,
  nextVariableDraft,
  withToggledIntegrations,
} from './data';

export default {
  name: 'Settings',
  components: { TopBar, TabStrip, GeneralTab, MembersTab, CicdTab, IntegrationsTab, CommandPalette },
  props: {
    userName: { type: String, default: 'Jordan Diaz' },
    userInitials: { type: String, default: 'JD' },
    // Swap in a real settings API by passing partial overrides shaped like createInitialState()'s output.
    initialState: { type: Object, default: () => ({}) },
    notifications: { type: Object, default: () => notificationCenter },
  },
  data() {
    return {
      ...createInitialState(this.initialState),
      tabs: TABS,
      paletteOpen: false,
      theme: loadSettings().theme,
    };
  },
  computed: {
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
  created() {
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
    selectTab(id) {
      this.tab = id;
    },
    toggleTheme() {
      const next = this.dark ? 'light' : 'dark';
      this.theme = next;
      updateSettings({ theme: next });
    },
    onVisibilityChange(value) {
      this.visibility = value;
      this.notifications.notify({ title: 'Visibility updated', message: `Project is now ${value}.`, severity: 'info' });
    },
    onLogoColorChange(color) {
      this.logoColor = color;
    },
    onLogoUpload(fileName) {
      this.logoFileName = fileName;
      this.notifications.notify({ title: 'Logo uploaded', message: `${fileName} converted locally into every display size.`, severity: 'success' });
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
      this.members = withRole(this.members, id, role);
      this.notifications.notify({ title: 'Role updated', message: `Member role changed to ${role}.`, severity: 'info' });
    },
    onRemoveMembers(ids) {
      const removedCount = ids.length;
      this.members = withoutIds(this.members, ids);
      this.notifications.notify({ title: 'Member access removed', message: `${removedCount} member${removedCount === 1 ? '' : 's'} removed from this project.`, severity: 'warning' });
    },
    onAddVariable() {
      this.variables = [...this.variables, nextVariableDraft(this.variables.length)];
      this.notifications.notify({ title: 'Variable added', message: 'Rename the new variable and set its value.', severity: 'info' });
    },
    onToggleReveal(id) {
      this.variables = withToggledReveal(this.variables, id);
    },
    onRemoveVariables(ids) {
      this.variables = withoutIds(this.variables, ids);
      this.notifications.notify({ title: 'Variable deleted', message: `${ids.length} variable${ids.length === 1 ? '' : 's'} removed.`, severity: 'warning' });
    },
    onUnprotectBranches(ids) {
      this.protectedBranches = withoutIds(this.protectedBranches, ids);
      this.notifications.notify({ title: 'Branch unprotected', message: `${ids.length} branch${ids.length === 1 ? '' : 'es'} no longer protected.`, severity: 'warning' });
    },
    onToggleIntegration(id) {
      this.integrations = withToggledIntegrations(this.integrations, [id], !this.integrations.find((integration) => integration.id === id).on);
    },
    onBulkToggleIntegrations({ ids, on }) {
      if (ids.length === 0) return;
      this.integrations = withToggledIntegrations(this.integrations, ids, on);
      this.notifications.notify({ title: on ? 'Integrations enabled' : 'Integrations disabled', message: `${ids.length} integration${ids.length === 1 ? '' : 's'} updated.`, severity: 'info' });
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
</style>
