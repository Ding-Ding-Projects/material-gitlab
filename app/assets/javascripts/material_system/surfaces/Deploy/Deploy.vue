<template>
  <div class="dp-surface" :data-theme="themeAttr">
    <div class="dp-shell">
      <DeploySidebar :items="sidebarItems" :sub-items="subNavItems" :active-tab-id="activeTabId" @select-tab="selectTab" />

      <div class="dp-main">
        <DeployTopBar
          :search="search"
          :search-placeholder="searchPlaceholder"
          :regex-mode="regexMode"
          :search-valid="searchMatcher.valid"
          :search-error="searchMatcher.error"
          :regex-open="regexOpen"
          :regex-initial-pattern="regexMode ? search : ''"
          :regex-corpus="regexCorpus"
          :dark="dark"
          @update:search="setSearch"
          @toggle-regex-mode="toggleRegexMode"
          @open-regex-builder="openRegexBuilder"
          @close-regex-builder="closeRegexBuilder"
          @apply-regex="applyRegex"
          @open-palette="openPalette"
          @toggle-theme="toggleTheme"
        />

        <div class="dp-heading-row">
          <h1 class="dp-heading">Deploy</h1>
          <DeployTabs :tabs="tabs" :active-id="activeTabId" :instance-id="instanceId" @select="selectTab" />
        </div>

        <DeployRowList
          :key="activeTabId"
          :instance-id="instanceId"
          :rows="rows"
          :selected-ids="selectedIds"
          :item-label-plural="itemLabelPlural"
          @toggle-select="toggleSelectRow"
          @select-all="selectAll"
          @clear-selection="clearSelection"
          @invert-selection="invertSelection"
          @act="act"
        >
          <template #bulk-actions>
            <template v-if="activeTabId === 'releases'">
              <button type="button" class="dp-bulk-btn" @click="copySelectedTags">
                <DpIcon name="copy" size="small" />Copy tag references
              </button>
            </template>
            <template v-else-if="activeTabId === 'feature-flags'">
              <button type="button" class="dp-bulk-btn" @click="enableSelectedFlags">
                <DpIcon name="toggle-on" size="small" />Enable selected
              </button>
              <button type="button" class="dp-bulk-btn" @click="disableSelectedFlags">
                <DpIcon name="toggle-off" size="small" />Disable selected
              </button>
            </template>
            <template v-else>
              <button type="button" class="dp-bulk-btn dp-bulk-btn--danger" @click="requestBulkDelete(activeTabId)">
                <DpIcon name="delete" size="small" />Delete selected
              </button>
            </template>
          </template>
        </DeployRowList>
      </div>
    </div>

    <CommandPalette v-if="paletteOpen" :actions="paletteActions" @close="closePalette" />

    <ConfirmDialog
      v-if="confirm"
      :title="confirm.title"
      :message="confirm.message"
      :confirm-label="confirm.confirmLabel"
      @confirm="confirmAction"
      @cancel="cancelConfirm"
    />

    <NotificationHost :notifications="notifications" />
  </div>
</template>

<script>
import DeploySidebar from './components/DeploySidebar.vue';
import DeployTopBar from './components/DeployTopBar.vue';
import DeployTabs from './components/DeployTabs.vue';
import DeployRowList from './components/DeployRowList.vue';
import DpIcon from './components/DpIcon.vue';
import CommandPalette from './components/CommandPalette.vue';
import ConfirmDialog from './components/ConfirmDialog.vue';
import NotificationHost from './components/NotificationHost.vue';
import { loadSettings, subscribeSettings, updateSettings } from '../../settings';
import notificationCenter from '../../notifications';
import {
  DEPLOY_TABS,
  DEPLOY_SIDEBAR_ITEMS,
  DEPLOY_SUBNAV,
  createInitialReleases,
  createInitialFlags,
  createInitialPackages,
  createInitialImages,
  createSearchMatcher,
  releaseCorpus,
  flagCorpus,
  packageCorpus,
  containerCorpus,
  formatRelativeTime,
  formatBytes,
} from './data';

const ITEM_LABELS = Object.freeze({
  releases: 'releases',
  'feature-flags': 'feature flags',
  packages: 'packages',
  containers: 'container images',
});

export default {
  name: 'Deploy',
  components: {
    DeploySidebar,
    DeployTopBar,
    DeployTabs,
    DeployRowList,
    DpIcon,
    CommandPalette,
    ConfirmDialog,
    NotificationHost,
  },
  props: {
    // Swap these for a real API fetch by passing already-loaded arrays into the surface.
    initialReleases: { type: Array, default: () => createInitialReleases() },
    initialFlags: { type: Array, default: () => createInitialFlags() },
    initialPackages: { type: Array, default: () => createInitialPackages() },
    initialImages: { type: Array, default: () => createInitialImages() },
    // Optional standalone notification centre override, for host-app wiring/tests.
    notifications: { type: Object, default: () => notificationCenter },
  },
  data() {
    return {
      instanceId: `dp-${Math.random().toString(36).slice(2, 9)}`,
      themeAttr: this.resolveThemeAttr(),
      search: '',
      regexMode: false,
      regexOpen: false,
      paletteOpen: false,
      activeTabId: 'releases',
      releases: this.initialReleases,
      flags: this.initialFlags,
      packages: this.initialPackages,
      images: this.initialImages,
      selection: { releases: [], 'feature-flags': [], packages: [], containers: [] },
      confirm: null,
    };
  },
  computed: {
    dark() {
      if (this.themeAttr === 'dark') return true;
      if (this.themeAttr === 'light') return false;
      return typeof window !== 'undefined' && !!window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    },
    tabs() {
      return DEPLOY_TABS;
    },
    sidebarItems() {
      return DEPLOY_SIDEBAR_ITEMS;
    },
    subNavItems() {
      return DEPLOY_SUBNAV;
    },
    currentTabLabel() {
      const tab = this.tabs.find((t) => t.id === this.activeTabId);
      return tab ? tab.label : '';
    },
    itemLabelPlural() {
      return ITEM_LABELS[this.activeTabId] || 'items';
    },
    searchPlaceholder() {
      const label = this.currentTabLabel.toLowerCase();
      return this.regexMode ? `Regex search — ${label}` : `Search ${label}`;
    },
    searchMatcher() {
      return createSearchMatcher({ query: this.search, regexMode: this.regexMode });
    },
    selectedIds() {
      return this.selection[this.activeTabId] || [];
    },
    rows() {
      const matcher = this.searchMatcher;
      if (this.activeTabId === 'releases') {
        return this.releases
          .filter((release) => matcher.test(releaseCorpus(release)))
          .map((release) => ({
            id: release.id,
            icon: 'releases',
            iconColor: 'var(--dp-prim)',
            title: release.name,
            titleMono: false,
            sub: release.sub,
            badge: null,
            meta: formatRelativeTime(release.createdAt),
            action: null,
            actionColor: null,
          }));
      }
      if (this.activeTabId === 'feature-flags') {
        return this.flags
          .filter((flag) => matcher.test(flagCorpus(flag)))
          .map((flag) => ({
            id: flag.id,
            icon: flag.on ? 'toggle-on' : 'toggle-off',
            iconColor: flag.on ? 'var(--dp-good)' : 'var(--dp-outl)',
            title: flag.name,
            titleMono: true,
            sub: flag.sub,
            badge: flag.on ? 'enabled' : 'disabled',
            badgeBg: flag.on ? 'var(--dp-goodc)' : 'var(--dp-surfch)',
            badgeFg: flag.on ? 'var(--dp-good)' : 'var(--dp-onsurfv)',
            meta: '',
            action: flag.on ? 'Disable' : 'Enable',
            actionColor: 'var(--dp-onprimc)',
          }));
      }
      if (this.activeTabId === 'packages') {
        return this.packages
          .filter((pkg) => matcher.test(packageCorpus(pkg)))
          .map((pkg) => ({
            id: pkg.id,
            icon: 'package',
            iconColor: 'var(--dp-prim)',
            title: pkg.name,
            titleMono: true,
            sub: pkg.sub,
            badge: null,
            meta: `${formatBytes(pkg.sizeBytes)} · ${formatRelativeTime(pkg.createdAt)}`,
            action: 'Delete',
            actionColor: 'var(--dp-err)',
          }));
      }
      return this.images
        .filter((image) => matcher.test(containerCorpus(image)))
        .map((image) => ({
          id: image.id,
          icon: 'container',
          iconColor: 'var(--dp-prim)',
          title: image.name,
          titleMono: true,
          sub: image.sub,
          badge: null,
          meta: `${formatBytes(image.sizeBytes)} · ${formatRelativeTime(image.createdAt)}`,
          action: 'Delete',
          actionColor: 'var(--dp-err)',
        }));
    },
    regexCorpus() {
      return [
        ...this.releases.map((r) => r.name),
        ...this.flags.map((f) => f.name),
        ...this.packages.map((p) => p.name),
        ...this.images.map((i) => i.name),
      ];
    },
    paletteActions() {
      return [
        { label: 'Toggle dark theme', icon: this.dark ? 'sun' : 'moon', run: () => this.toggleTheme() },
        ...this.tabs.map((tab) => ({ label: `Deploy: ${tab.label}`, icon: 'releases', run: () => this.selectTab(tab.id) })),
      ];
    },
  },
  watch: {
    rows(newRows) {
      const visibleIds = new Set(newRows.map((row) => row.id));
      const current = this.selection[this.activeTabId] || [];
      const pruned = current.filter((id) => visibleIds.has(id));
      if (pruned.length !== current.length) this.setSelection(pruned);
    },
  },
  created() {
    this.unsubscribeSettings = subscribeSettings(() => {
      this.themeAttr = this.resolveThemeAttr();
    });
  },
  mounted() {
    this.onKeydown = (event) => {
      if (event.ctrlKey && event.shiftKey && (event.key === 'F' || event.key === 'f')) {
        event.preventDefault();
        this.paletteOpen = true;
      } else if (event.key === 'Escape') {
        this.paletteOpen = false;
        this.regexOpen = false;
      }
    };
    window.addEventListener('keydown', this.onKeydown);
  },
  beforeDestroy() {
    window.removeEventListener('keydown', this.onKeydown);
    if (this.unsubscribeSettings) this.unsubscribeSettings();
  },
  methods: {
    resolveThemeAttr() {
      const { theme } = loadSettings();
      return theme === 'light' || theme === 'dark' ? theme : undefined;
    },
    toggleTheme() {
      updateSettings({ theme: this.dark ? 'light' : 'dark' });
      this.themeAttr = this.resolveThemeAttr();
    },
    setSearch(value) {
      this.search = value;
    },
    toggleRegexMode() {
      this.regexMode = !this.regexMode;
    },
    openRegexBuilder() {
      this.regexOpen = true;
    },
    closeRegexBuilder() {
      this.regexOpen = false;
    },
    applyRegex(pattern) {
      this.search = pattern;
      this.regexMode = true;
      this.regexOpen = false;
    },
    openPalette() {
      this.paletteOpen = true;
    },
    closePalette() {
      this.paletteOpen = false;
    },
    selectTab(tabId) {
      this.activeTabId = tabId;
      this.paletteOpen = false;
    },
    setSelection(ids) {
      this.selection = { ...this.selection, [this.activeTabId]: ids };
    },
    toggleSelectRow(id) {
      const current = this.selectedIds;
      const next = current.includes(id) ? current.filter((x) => x !== id) : [...current, id];
      this.setSelection(next);
    },
    selectAll() {
      this.setSelection(this.rows.map((row) => row.id));
    },
    clearSelection() {
      this.setSelection([]);
    },
    invertSelection() {
      const current = new Set(this.selectedIds);
      this.setSelection(this.rows.filter((row) => !current.has(row.id)).map((row) => row.id));
    },
    act(id) {
      if (this.activeTabId === 'feature-flags') this.toggleFlag(id);
      else if (this.activeTabId === 'packages') this.requestDeleteRow('packages', id);
      else if (this.activeTabId === 'containers') this.requestDeleteRow('containers', id);
    },
    toggleFlag(id) {
      const flag = this.flags.find((f) => f.id === id);
      if (!flag) return;
      const next = !flag.on;
      this.flags = this.flags.map((f) => (f.id === id ? { ...f, on: next } : f));
      this.notify({ title: flag.name, message: `${flag.name} is now ${next ? 'enabled' : 'disabled'}.`, severity: 'success' });
    },
    enableSelectedFlags() {
      this.setFlagsOn(true);
    },
    disableSelectedFlags() {
      this.setFlagsOn(false);
    },
    setFlagsOn(on) {
      const ids = new Set(this.selectedIds);
      if (ids.size === 0) return;
      this.flags = this.flags.map((f) => (ids.has(f.id) ? { ...f, on } : f));
      this.notify({
        title: on ? 'Flags enabled' : 'Flags disabled',
        message: `${ids.size} feature flag${ids.size === 1 ? '' : 's'} ${on ? 'enabled' : 'disabled'}.`,
        severity: 'success',
      });
    },
    async copySelectedTags() {
      const ids = new Set(this.selectedIds);
      if (ids.size === 0) return;
      const tags = this.releases.filter((r) => ids.has(r.id)).map((r) => r.tagRef);
      const copied = await this.copyToClipboard(tags.join('\n'));
      if (copied) {
        this.notify({ title: 'Copied', message: `Copied ${tags.length} tag reference${tags.length === 1 ? '' : 's'} to the clipboard.`, severity: 'success' });
      } else {
        this.notify({ title: 'Copy failed', message: "Couldn't copy to the clipboard. Select and copy the tags manually.", severity: 'error' });
      }
    },
    async copyToClipboard(text) {
      try {
        if (navigator.clipboard && navigator.clipboard.writeText) {
          await navigator.clipboard.writeText(text);
          return true;
        }
      } catch (_error) {
        // fall through to the legacy execCommand path below
      }
      try {
        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.setAttribute('readonly', '');
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        const ok = document.execCommand('copy');
        document.body.removeChild(textarea);
        return ok;
      } catch (_error) {
        return false;
      }
    },
    requestDeleteRow(kind, id) {
      const list = kind === 'packages' ? this.packages : this.images;
      const item = list.find((entry) => entry.id === id);
      if (!item) return;
      const noun = kind === 'packages' ? 'package' : 'container image';
      this.confirm = {
        title: `Delete this ${noun}?`,
        message: `${item.name} will be permanently deleted. This can't be undone.`,
        confirmLabel: 'Delete',
        run: () => this.deleteRows(kind, [id]),
      };
    },
    requestBulkDelete(kind) {
      const ids = this.selectedIds;
      if (ids.length === 0) return;
      const nounPlural = kind === 'packages' ? 'packages' : 'container images';
      const nounSingular = kind === 'packages' ? 'package' : 'container image';
      this.confirm = {
        title: `Delete ${ids.length} ${ids.length === 1 ? nounSingular : nounPlural}?`,
        message: `${ids.length} selected ${ids.length === 1 ? nounSingular : nounPlural} will be permanently deleted. This can't be undone.`,
        confirmLabel: 'Delete',
        run: () => this.deleteRows(kind, ids),
      };
    },
    deleteRows(kind, ids) {
      const idSet = new Set(ids);
      if (kind === 'packages') this.packages = this.packages.filter((p) => !idSet.has(p.id));
      else this.images = this.images.filter((image) => !idSet.has(image.id));
      this.setSelection(this.selectedIds.filter((id) => !idSet.has(id)));
      const noun = kind === 'packages' ? 'package' : 'container image';
      this.notify({ title: 'Deleted', message: `${ids.length} ${noun}${ids.length === 1 ? '' : 's'} deleted.`, severity: 'success' });
    },
    confirmAction() {
      if (this.confirm && typeof this.confirm.run === 'function') this.confirm.run();
      this.confirm = null;
    },
    cancelConfirm() {
      this.confirm = null;
    },
    notify(options) {
      this.notifications.notify(options);
    },
  },
};
</script>

<style lang="scss" src="./deploy.scss"></style>
