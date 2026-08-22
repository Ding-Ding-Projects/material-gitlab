<template>
  <div id="am-tabpanel-status" class="am-tabpanel" role="tabpanel" aria-labelledby="am-tab-status" tabindex="0">
    <div class="am-statushub-bar">
      <span class="am-statushub-bar__live" :class="{ 'am-statushub-bar__live--on': liveRefresh }">
        <span class="am-statushub-bar__dot" aria-hidden="true"></span>
        {{ liveRefresh ? 'Live' : 'Paused' }}
      </span>
      <span class="am-statushub-bar__updated">Last refreshed {{ lastRefreshedLabel }}</span>
      <label class="am-statushub-bar__toggle">
        <input type="checkbox" :checked="liveRefresh" @change="$emit('toggle-live', $event.target.checked)" />
        Auto-refresh every {{ refreshSeconds }}s
      </label>
      <button type="button" class="am-btn am-btn--outline am-btn--small" @click="$emit('refresh-now')">
        <MaterialIcon name="sync" :size="15" /> Refresh now
      </button>
    </div>

    <p v-if="loading" class="am-loading-text">Loading session status…</p>
    <template v-else-if="items.length === 0">
      <EmptyState
        icon="robot"
        :message="totalCount === 0 ? 'No agent sessions reporting yet.' : 'No sessions match your search.'"
        :action-label="totalCount > 0 ? 'Clear search' : ''"
        @action="$emit('clear-search')"
      />
    </template>
    <template v-else>
      <SelectionToolbar
        v-if="selectedIds.length > 0"
        :selected-count="selectedIds.length"
        :visible-count="items.length"
        :total-count="totalCount"
        item-label-plural="sessions"
        @select-all="$emit('select-all')"
        @invert="$emit('invert')"
        @clear="$emit('clear')"
      >
        <template #actions>
          <button type="button" class="am-btn am-btn--text am-btn--small" @click="$emit('bulk-refresh')">
            <MaterialIcon name="sync" :size="16" /> Refresh selected
          </button>
          <button type="button" class="am-btn am-btn--text am-btn--small" @click="$emit('bulk-archive')">
            <MaterialIcon name="save" :size="16" /> Archive selected
          </button>
        </template>
      </SelectionToolbar>
      <div class="am-sessions-grid">
        <SessionCard
          v-for="session in items"
          :key="session.id"
          :session="session"
          :selected="selectedIds.includes(session.id)"
          :draft="drafts[session.id] || ''"
          :last-reply="replies[session.id] || ''"
          :now="now"
          @toggle-select="$emit('toggle-select', $event)"
          @draft="$emit('draft', session.id, $event)"
          @send="$emit('send', $event)"
        />
      </div>
    </template>
  </div>
</template>

<script>
import EmptyState from './EmptyState.vue';
import MaterialIcon from './MaterialIcon.vue';
import SelectionToolbar from './SelectionToolbar.vue';
import SessionCard from './SessionCard.vue';

export default {
  name: 'StatusHubTab',
  components: { EmptyState, SessionCard, SelectionToolbar, MaterialIcon },
  props: {
    items: {
      type: Array,
      required: true,
    },
    totalCount: {
      type: Number,
      required: true,
    },
    selectedIds: {
      type: Array,
      required: true,
    },
    drafts: {
      type: Object,
      required: true,
    },
    replies: {
      type: Object,
      required: true,
    },
    loading: {
      type: Boolean,
      default: false,
    },
    liveRefresh: {
      type: Boolean,
      default: true,
    },
    refreshSeconds: {
      type: Number,
      default: 20,
    },
    lastRefreshedAt: {
      // Number until the first fetch resolves, then null beforehand — no
      // strict `type` so Vue does not warn on the legitimate null state.
      default: null,
    },
    now: {
      type: Number,
      required: true,
    },
  },
  computed: {
    lastRefreshedLabel() {
      if (!this.lastRefreshedAt) return 'never';
      const seconds = Math.max(0, Math.round((this.now - this.lastRefreshedAt) / 1000));
      if (seconds < 5) return 'just now';
      if (seconds < 60) return `${seconds}s ago`;
      return `${Math.floor(seconds / 60)}m ago`;
    },
  },
};
</script>
