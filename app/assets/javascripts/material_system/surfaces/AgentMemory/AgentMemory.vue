<template>
  <div class="am-root" :data-theme="dark ? 'dark' : 'light'">
    <div class="am-shell">
      <AgentMemorySidebar :active-tab="activeTab" @select-tab="activeTab = $event" />

      <div class="am-main">
        <TopBar
          ref="topBar"
          :search="search"
          :regex-mode="regexMode"
          :corpus="regexCorpus"
          :dark="dark"
          @update:search="search = $event"
          @toggle-regex-mode="regexMode = !regexMode"
          @apply-regex="onApplyRegex"
          @open-palette="paletteOpen = true"
          @toggle-theme="toggleTheme"
        />

        <div class="am-page-head">
          <h1 class="am-page-title">Agent Memory</h1>
          <TabStrip :tabs="tabs" :active="activeTab" @change="activeTab = $event" />
        </div>

        <main class="am-main-content">
          <InstructionsTab
            v-if="activeTab === 'instructions'"
            :targets="targets"
            :items="visibleBlocks"
            :total-count="blocks.length"
            :selected-ids="selection.blocks"
            :loading="loading.blocks"
            @clear-search="clearSearch"
            @toggle-select="toggleSelect('blocks', $event)"
            @select-all="selectAllVisible('blocks', visibleBlocks)"
            @invert="invertSelection('blocks', visibleBlocks)"
            @clear="clearSelection('blocks')"
            @bulk-copy="bulkCopyBlocks"
            @bulk-export="bulkExportBlocks"
          />

          <SkillsTab
            v-else-if="activeTab === 'skills'"
            :items="visibleSkills"
            :total-count="skills.length"
            :selected-ids="selection.skills"
            :loading="loading.skills"
            @clear-search="clearSearch"
            @toggle-select="toggleSelect('skills', $event)"
            @select-all="selectAllVisible('skills', visibleSkills)"
            @invert="invertSelection('skills', visibleSkills)"
            @clear="clearSelection('skills')"
            @bulk-copy="bulkCopySkills"
            @bulk-reinstall="bulkReinstallSkills"
            @bulk-uninstall="requestBulkUninstallSkills"
            @uninstall="requestUninstallSkill"
          />

          <StatusHubTab
            v-else-if="activeTab === 'status'"
            :items="visibleSessions"
            :total-count="sessions.length"
            :selected-ids="selection.sessions"
            :drafts="drafts"
            :replies="replies"
            :loading="loading.sessions"
            :live-refresh="liveRefresh"
            :refresh-seconds="refreshSeconds"
            :last-refreshed-at="lastRefreshedAt"
            :now="now"
            @clear-search="clearSearch"
            @toggle-select="toggleSelect('sessions', $event)"
            @select-all="selectAllVisible('sessions', visibleSessions)"
            @invert="invertSelection('sessions', visibleSessions)"
            @clear="clearSelection('sessions')"
            @bulk-refresh="bulkRefreshSessions"
            @bulk-archive="bulkArchiveSessions"
            @draft="setDraft"
            @send="sendReply"
            @toggle-live="toggleLiveRefresh"
            @refresh-now="refreshNow(false)"
          />

          <SyncTab v-else-if="activeTab === 'sync'" :phase="syncPhase" :steps="syncStepsView" @run-sync="runSync" />

          <HistoryTab
            v-else-if="activeTab === 'history'"
            :items="visibleHistory"
            :total-count="history.length"
            :selected-ids="selection.history"
            :loading="loading.history"
            @clear-search="clearSearch"
            @toggle-select="toggleSelect('history', $event)"
            @select-all="selectAllVisible('history', visibleHistory)"
            @invert="invertSelection('history', visibleHistory)"
            @clear="clearSelection('history')"
            @restore="restoreEntry"
            @bulk-restore="bulkRestoreHistory"
            @bulk-export="bulkExportHistory"
          />
        </main>
      </div>
    </div>

    <ConfirmDialog
      :open="confirm.open"
      :title="confirm.title"
      :message="confirm.message"
      :confirm-label="confirm.confirmLabel"
      cancel-label="Cancel"
      @confirm="onConfirmAccept"
      @cancel="closeConfirm"
    />

    <CommandPalette :open="paletteOpen" :actions="paletteActions" @close="paletteOpen = false" />

    <NotificationToastHost />
  </div>
</template>

<script>
import { loadSettings, subscribeSettings, updateSettings } from '../../settings';
import { notificationCenter } from '../../notifications';
import AgentMemorySidebar from './components/AgentMemorySidebar.vue';
import ConfirmDialog from './components/ConfirmDialog.vue';
import CommandPalette from './components/CommandPalette.vue';
import HistoryTab from './components/HistoryTab.vue';
import InstructionsTab from './components/InstructionsTab.vue';
import NotificationToastHost from './components/NotificationToastHost.vue';
import SkillsTab from './components/SkillsTab.vue';
import StatusHubTab from './components/StatusHubTab.vue';
import SyncTab from './components/SyncTab.vue';
import TabStrip from './components/TabStrip.vue';
import TopBar from './components/TopBar.vue';
import {
  TABS,
  nextHistoryRevisionId,
  withStartedAt,
} from './data';

const TAB_ICONS = {
  instructions: 'document',
  skills: 'chip',
  status: 'robot',
  sync: 'cloud-sync',
  history: 'undo',
};

const REFRESH_SECONDS = 20;
const CLOCK_TICK_MS = 15000;

export default {
  name: 'AgentMemory',
  components: {
    AgentMemorySidebar,
    TopBar,
    TabStrip,
    InstructionsTab,
    SkillsTab,
    StatusHubTab,
    SyncTab,
    HistoryTab,
    ConfirmDialog,
    CommandPalette,
    NotificationToastHost,
  },
  props: {
    initialData: { type: Object, default: () => ({}) },
    dataEndpoint: { type: String, default: '' },
  },
  data() {
    return {
      tabs: TABS,
      activeTab: 'instructions',
      search: '',
      regexMode: false,
      regexFlags: 'gi',
      paletteOpen: false,
      themeSetting: 'system',
      systemPrefersDark: false,
      now: Date.now(),
      loading: { targets: true, blocks: true, skills: true, sessions: true, history: true },
      targets: [],
      blocks: [],
      skills: [],
      sessions: [],
      history: [],
      baseSyncSteps: [],
      syncPhase: 'idle',
      drafts: {},
      replies: {},
      selection: { blocks: [], skills: [], sessions: [], history: [] },
      confirm: { open: false, title: '', message: '', confirmLabel: 'Confirm', action: null },
      liveRefresh: true,
      refreshSeconds: REFRESH_SECONDS,
      lastRefreshedAt: null,
    };
  },
  computed: {
    dark() {
      if (this.themeSetting === 'dark') return true;
      if (this.themeSetting === 'light') return false;
      return this.systemPrefersDark;
    },
    matcher() {
      const query = this.search;
      if (!query) return () => true;
      if (this.regexMode) {
        const flags = this.regexFlags.replace(/[gy]/g, '');
        try {
          // eslint-disable-next-line no-new
          new RegExp(query, flags);
        } catch (error) {
          return () => true;
        }
        return (text) => {
          try {
            return new RegExp(query, flags).test(text);
          } catch (error) {
            return true;
          }
        };
      }
      const lower = query.toLowerCase();
      return (text) => text.toLowerCase().includes(lower);
    },
    regexCorpus() {
      return [
        ...this.blocks.map((block) => block.title),
        ...this.skills.map((skill) => skill.name),
        ...this.sessions.map((session) => `${session.agent} ${session.task}`),
      ];
    },
    visibleBlocks() {
      return this.blocks.filter((block) => this.matcher(`${block.title} ${block.summary}`));
    },
    visibleSkills() {
      return this.skills.filter((skill) => this.matcher(`${skill.name} ${skill.description}`));
    },
    visibleSessions() {
      return this.sessions.filter((session) => this.matcher(`${session.agent} ${session.task}`));
    },
    visibleHistory() {
      return this.history.filter((entry) => this.matcher(`${entry.title} ${entry.id}`));
    },
    syncStepsView() {
      const order = ['verify', 'backup', 'block', 'skills'];
      const activeIndex = order.indexOf(this.syncPhase);
      return this.baseSyncSteps.map((step, index) => {
        const done = this.syncPhase === 'done' || (activeIndex > -1 && index < activeIndex);
        const active = activeIndex === index;
        return {
          ...step,
          active,
          icon: done ? 'check-circle' : active ? 'sync' : 'circle',
        };
      });
    },
    paletteActions() {
      const actions = [
        {
          id: 'toggle-theme',
          label: this.dark ? 'Switch to light theme' : 'Switch to dark theme',
          icon: this.dark ? 'sun' : 'moon',
          group: 'Appearance',
          run: () => this.toggleTheme(),
        },
        {
          id: 'focus-search',
          label: 'Focus search',
          icon: 'search',
          group: 'Navigate',
          run: () => this.$nextTick(() => this.$refs.topBar && this.$refs.topBar.focusSearch()),
        },
        {
          id: 'run-sync',
          label: 'Run canonical sync now',
          icon: 'sync',
          group: 'Sync',
          run: () => this.runSync(),
        },
        {
          id: 'refresh-sessions',
          label: 'Refresh sessions now',
          icon: 'sync',
          group: 'Status Hub',
          run: () => this.refreshNow(false),
        },
      ];
      this.tabs.forEach((tab) => {
        actions.push({
          id: `tab-${tab.key}`,
          label: `Memory: ${tab.label}`,
          icon: TAB_ICONS[tab.key],
          group: 'Navigate',
          run: () => {
            this.activeTab = tab.key;
          },
        });
      });
      this.blocks.forEach((block) => {
        actions.push({
          id: `jump-block-${block.id}`,
          label: `Jump to: ${block.title}`,
          icon: 'document',
          group: 'Instructions',
          run: () => this.teleport(block.id, 'instructions'),
        });
      });
      this.skills.forEach((skill) => {
        actions.push({
          id: `jump-skill-${skill.id}`,
          label: `Jump to: ${skill.name}`,
          icon: skill.icon,
          group: 'Skills',
          run: () => this.teleport(skill.id, 'skills'),
        });
      });
      this.sessions.forEach((session) => {
        actions.push({
          id: `jump-session-${session.id}`,
          label: `Jump to: ${session.agent}`,
          icon: 'robot',
          group: 'Status Hub',
          run: () => this.teleport(`session-${session.id}`, 'status'),
        });
      });
      this.history.forEach((entry) => {
        actions.push({
          id: `jump-history-${entry.id}`,
          label: `Jump to: ${entry.title}`,
          icon: entry.icon,
          group: 'History',
          run: () => this.teleport(entry.id, 'history'),
        });
      });
      return actions;
    },
  },
  mounted() {
    this.loadAll();

    const settings = loadSettings();
    this.themeSetting = settings.theme;
    this.systemThemeQuery = window.matchMedia('(prefers-color-scheme: dark)');
    this.systemPrefersDark = this.systemThemeQuery.matches;
    this.onSystemThemeChange = (event) => {
      this.systemPrefersDark = event.matches;
    };
    this.systemThemeQuery.addEventListener('change', this.onSystemThemeChange);
    this.unsubscribeSettings = subscribeSettings((next) => {
      this.themeSetting = next.theme;
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

    this.clockTimer = window.setInterval(() => {
      this.now = Date.now();
    }, CLOCK_TICK_MS);
    this.startLiveRefresh();
  },
  beforeDestroy() {
    window.removeEventListener('keydown', this.onKeydown);
    if (this.systemThemeQuery) this.systemThemeQuery.removeEventListener('change', this.onSystemThemeChange);
    if (this.unsubscribeSettings) this.unsubscribeSettings();
    if (this.clockTimer) window.clearInterval(this.clockTimer);
    if (this.syncTimer) window.clearTimeout(this.syncTimer);
    this.stopLiveRefresh();
  },
  methods: {
    loadAll() {
      const apply = (payload) => {
        const data = payload || {};
        this.targets = data.targets || [];
        this.blocks = data.blocks || [];
        this.skills = data.skills || [];
        this.sessions = withStartedAt(data.sessions || [], this.now);
        this.history = data.history || [];
        this.baseSyncSteps = data.syncSteps || [];
        this.loading = { targets: false, blocks: false, skills: false, sessions: false, history: false };
        this.lastRefreshedAt = Date.now();
      };

      if (Object.keys(this.initialData || {}).length) {
        apply(this.initialData);
        return;
      }
      if (!this.dataEndpoint) {
        apply({});
        return;
      }
      fetch(this.dataEndpoint, { credentials: 'same-origin', headers: { Accept: 'application/json' } })
        .then((response) => (response.ok ? response.json() : Promise.reject(new Error('Agent Memory data is unavailable.'))))
        .then(apply)
        .catch(() => apply({}));
    },
    clearSearch() {
      this.search = '';
      this.regexMode = false;
    },
    onApplyRegex({ pattern, flags }) {
      this.search = pattern;
      this.regexFlags = flags;
      this.regexMode = true;
    },
    toggleTheme() {
      this.themeSetting = this.dark ? 'light' : 'dark';
      updateSettings({ theme: this.themeSetting });
    },

    // --- selection -------------------------------------------------------
    toggleSelect(listKey, id) {
      const current = this.selection[listKey];
      this.selection[listKey] = current.includes(id)
        ? current.filter((entry) => entry !== id)
        : [...current, id];
    },
    selectAllVisible(listKey, visibleItems) {
      this.selection[listKey] = visibleItems.map((item) => item.id);
    },
    invertSelection(listKey, visibleItems) {
      const visibleIds = visibleItems.map((item) => item.id);
      const current = new Set(this.selection[listKey]);
      this.selection[listKey] = visibleIds.filter((id) => !current.has(id));
    },
    clearSelection(listKey) {
      this.selection[listKey] = [];
    },

    // --- shared utilities --------------------------------------------------
    async copyText(text) {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        try {
          await navigator.clipboard.writeText(text);
          return true;
        } catch (error) {
          return false;
        }
      }
      return false;
    },
    downloadTextFile(filename, text) {
      const blob = new Blob([text], { type: 'text/markdown;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    },
    openConfirm({ title, message, confirmLabel = 'Confirm', action }) {
      this.confirm = { open: true, title, message, confirmLabel, action };
    },
    closeConfirm() {
      this.confirm = { ...this.confirm, open: false, action: null };
    },
    onConfirmAccept() {
      const { action } = this.confirm;
      this.closeConfirm();
      if (typeof action === 'function') action();
    },

    // --- instruction blocks --------------------------------------------
    async bulkCopyBlocks() {
      const selected = this.blocks.filter((block) => this.selection.blocks.includes(block.id));
      await this.copyText(selected.map((block) => `${block.title} — ${block.summary}`).join('\n'));
      notificationCenter.notify({
        title: 'Copied',
        message: `${selected.length} block title(s) copied to clipboard.`,
        severity: 'success',
      });
    },
    bulkExportBlocks() {
      const selected = this.blocks.filter((block) => this.selection.blocks.includes(block.id));
      const text = selected
        .map((block) => `### ${block.title}\n\n${block.summary}\n\n_${block.lines} lines_\n`)
        .join('\n');
      this.downloadTextFile('instruction-blocks.md', text);
      notificationCenter.notify({
        title: 'Exported',
        message: `${selected.length} block(s) exported as Markdown.`,
        severity: 'success',
      });
    },

    // --- skills ------------------------------------------------------------
    async bulkCopySkills() {
      const selected = this.skills.filter((skill) => this.selection.skills.includes(skill.id));
      await this.copyText(selected.map((skill) => skill.name).join('\n'));
      notificationCenter.notify({
        title: 'Copied',
        message: `${selected.length} skill name(s) copied to clipboard.`,
        severity: 'success',
      });
    },
    bulkReinstallSkills() {
      const ids = [...this.selection.skills];
      if (ids.length === 0) return;
      this.skills = this.skills.map((skill) => (ids.includes(skill.id) ? { ...skill, status: 'installing' } : skill));
      window.setTimeout(() => {
        this.skills = this.skills.map((skill) =>
          ids.includes(skill.id) ? { ...skill, status: 'installed' } : skill,
        );
        notificationCenter.notify({
          title: 'Reinstalled',
          message: `${ids.length} skill(s) reinstalled.`,
          severity: 'success',
        });
      }, 900);
    },
    requestUninstallSkill(skill) {
      if (!skill.removable) {
        notificationCenter.notify({
          title: 'Cannot uninstall',
          message: `${skill.name} is a core skill and cannot be removed.`,
          severity: 'warning',
        });
        return;
      }
      this.openConfirm({
        title: `Uninstall ${skill.name}?`,
        message: `This removes ${skill.name} from the local skills catalog. It can be reinstalled from its canonical source at any time.`,
        confirmLabel: 'Uninstall',
        action: () => this.uninstallSkills([skill.id]),
      });
    },
    requestBulkUninstallSkills() {
      const selected = this.skills.filter((skill) => this.selection.skills.includes(skill.id));
      const removable = selected.filter((skill) => skill.removable);
      const blocked = selected.filter((skill) => !skill.removable);
      if (removable.length === 0) {
        notificationCenter.notify({
          title: 'Nothing to uninstall',
          message: 'The selected skill(s) are core and cannot be removed.',
          severity: 'warning',
        });
        return;
      }
      const message = blocked.length
        ? `${removable.map((skill) => skill.name).join(', ')} will be removed. ${blocked
            .map((skill) => skill.name)
            .join(', ')} is core and will be kept.`
        : `${removable.map((skill) => skill.name).join(', ')} will be removed from the local catalog.`;
      this.openConfirm({
        title: `Uninstall ${removable.length} skill(s)?`,
        message,
        confirmLabel: 'Uninstall',
        action: () => this.uninstallSkills(removable.map((skill) => skill.id)),
      });
    },
    uninstallSkills(ids) {
      this.skills = this.skills.filter((skill) => !ids.includes(skill.id));
      this.selection.skills = this.selection.skills.filter((id) => !ids.includes(id));
      notificationCenter.notify({
        title: 'Uninstalled',
        message: `${ids.length} skill(s) removed from the local catalog.`,
        severity: 'success',
      });
    },

    // --- status hub sessions -------------------------------------------
    setDraft(sessionId, value) {
      this.drafts = { ...this.drafts, [sessionId]: value };
    },
    sendReply(sessionId) {
      const draft = (this.drafts[sessionId] || '').trim();
      if (!draft) return;
      this.replies = { ...this.replies, [sessionId]: draft };
      this.drafts = { ...this.drafts, [sessionId]: '' };
      notificationCenter.notify({
        title: 'Delivered',
        message: `Reply delivered to the session inbox: "${draft}"`,
        severity: 'success',
        timeout: 4000,
      });
    },
    bulkRefreshSessions() {
      const ids = [...this.selection.sessions];
      if (ids.length === 0) return;
      this.now = Date.now();
      this.sessions = this.sessions.map((session) =>
        ids.includes(session.id) && !session.archived
          ? { ...session, startedAt: this.now, minutesAgo: 0 }
          : session,
      );
      notificationCenter.notify({
        title: 'Refreshed',
        message: `${ids.length} session(s) refreshed.`,
        severity: 'info',
      });
    },
    bulkArchiveSessions() {
      const ids = [...this.selection.sessions];
      if (ids.length === 0) return;
      this.sessions = this.sessions.map((session) =>
        ids.includes(session.id)
          ? { ...session, statusTone: 'neutral', archived: true, live: false, minutesAgo: null, startedAt: null }
          : session,
      );
      this.selection.sessions = [];
      notificationCenter.notify({
        title: 'Archived',
        message: `${ids.length} session(s) archived.`,
        severity: 'info',
      });
    },
    toggleLiveRefresh(value) {
      this.liveRefresh = value;
      if (value) this.startLiveRefresh();
      else this.stopLiveRefresh();
    },
    startLiveRefresh() {
      this.stopLiveRefresh();
      if (!this.liveRefresh) return;
      this.refreshTimer = window.setInterval(() => this.refreshNow(true), this.refreshSeconds * 1000);
    },
    stopLiveRefresh() {
      if (this.refreshTimer) {
        window.clearInterval(this.refreshTimer);
        this.refreshTimer = null;
      }
    },
    refreshNow(silent) {
      if (!this.dataEndpoint) return;
      fetch(this.dataEndpoint, { credentials: 'same-origin', headers: { Accept: 'application/json' } }).then((response) => response.json()).then((payload) => {
        const data = payload.sessions || [];
        const byId = new Map(this.sessions.map((session) => [session.id, session]));
        const merged = data.map((incoming) => {
          const existing = byId.get(incoming.id);
          return existing && existing.archived ? existing : incoming;
        });
        this.now = Date.now();
        this.sessions = withStartedAt(merged, this.now);
        this.lastRefreshedAt = this.now;
        if (!silent) {
          notificationCenter.notify({
            title: 'Sessions refreshed',
            message: `${merged.length} session(s) up to date.`,
            severity: 'info',
            timeout: 3000,
          });
        }
      });
    },

    // --- history -------------------------------------------------------
    restoreEntry(entry) {
      const id = nextHistoryRevisionId();
      this.history = [{ id, icon: 'undo', title: `Restored ${entry.id} as new revision`, when: 'just now' }, ...this.history];
      notificationCenter.notify({
        title: 'Restored',
        message: `${entry.id} restored as ${id}.`,
        severity: 'success',
      });
    },
    bulkRestoreHistory() {
      const selected = this.history.filter((entry) => this.selection.history.includes(entry.id));
      if (selected.length === 0) return;
      const created = selected.map((entry) => ({
        id: nextHistoryRevisionId(),
        icon: 'undo',
        title: `Restored ${entry.id} as new revision`,
        when: 'just now',
      }));
      this.history = [...created, ...this.history];
      this.selection.history = [];
      notificationCenter.notify({
        title: 'Restored',
        message: `${created.length} revision(s) restored as new entries.`,
        severity: 'success',
      });
    },
    bulkExportHistory() {
      const selected = this.history.filter((entry) => this.selection.history.includes(entry.id));
      const text = selected.map((entry) => `- ${entry.id} — ${entry.title} (${entry.when})`).join('\n');
      this.downloadTextFile('agent-memory-history.md', text);
      notificationCenter.notify({
        title: 'Exported',
        message: `${selected.length} history entry(ies) exported.`,
        severity: 'success',
      });
    },

    // --- command palette teleport ----------------------------------------
    teleport(anchorId, tabKey) {
      // Clear any active filter first — otherwise the target item can be
      // hidden from its tab's list and the teleport would silently fail.
      this.clearSearch();
      if (tabKey) this.activeTab = tabKey;
      this.$nextTick(() => {
        this.$nextTick(() => {
          const el = this.$el.querySelector(`[data-am-anchor="${anchorId}"]`);
          if (!el) return;
          const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
          el.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'center' });
          el.classList.add('am-flash');
          if (typeof el.focus === 'function') el.focus({ preventScroll: true });
          window.setTimeout(() => el.classList.remove('am-flash'), 1600);
        });
      });
    },
  },
};
</script>

<style lang="scss" src="./agentmemory.scss"></style>
