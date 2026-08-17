<template>
  <div id="am-tabpanel-history" class="am-tabpanel" role="tabpanel" aria-labelledby="am-tab-history" tabindex="0">
    <p v-if="loading" class="am-loading-text">Loading history…</p>
    <template v-else-if="items.length === 0">
      <EmptyState
        icon="undo"
        :message="totalCount === 0 ? 'No revisions recorded yet.' : 'No history entries match your search.'"
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
        item-label-plural="history entries"
        @select-all="$emit('select-all')"
        @invert="$emit('invert')"
        @clear="$emit('clear')"
      >
        <template #actions>
          <button type="button" class="am-btn am-btn--text am-btn--small" @click="$emit('bulk-restore')">
            <MaterialIcon name="undo" :size="16" /> Restore selected as new revisions
          </button>
          <button type="button" class="am-btn am-btn--text am-btn--small" @click="$emit('bulk-export')">
            <MaterialIcon name="save" :size="16" /> Export as changelog text
          </button>
        </template>
      </SelectionToolbar>
      <div class="am-card am-list-card">
        <HistoryRow
          v-for="entry in items"
          :key="entry.id"
          :entry="entry"
          :selected="selectedIds.includes(entry.id)"
          @toggle-select="$emit('toggle-select', $event)"
          @restore="$emit('restore', $event)"
        />
      </div>
    </template>
  </div>
</template>

<script>
import EmptyState from './EmptyState.vue';
import HistoryRow from './HistoryRow.vue';
import MaterialIcon from './MaterialIcon.vue';
import SelectionToolbar from './SelectionToolbar.vue';

export default {
  name: 'HistoryTab',
  components: { EmptyState, HistoryRow, SelectionToolbar, MaterialIcon },
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
    loading: {
      type: Boolean,
      default: false,
    },
  },
};
</script>
