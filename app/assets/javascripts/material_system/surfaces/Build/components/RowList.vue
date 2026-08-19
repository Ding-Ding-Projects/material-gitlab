<template>
  <div :id="`build-panel-${tabId}`" role="tabpanel" :aria-labelledby="`build-tab-${tabId}`" class="row-list-wrap">
    <bulk-action-bar
      v-if="rows.length"
      :total-visible="rows.length"
      :total-all="totalAll"
      :search-active="searchActive"
      :tab-label="tabLabel"
      :selected-count="selectedIds.length"
      :all-selected="allSelected"
      :indeterminate="indeterminate"
      :actions="bulkActions"
      @toggle-all="onToggleAll"
      @invert="$emit('invert')"
      @clear="$emit('clear')"
    />
    <ul v-if="rows.length" class="row-list">
      <row-item
        v-for="row in rows"
        :key="row.id"
        :row="row"
        :selected="selectedIds.includes(row.id)"
        @toggle="$emit('toggle', row.id)"
      />
    </ul>
    <empty-state
      v-else
      :icon="searchActive ? 'search' : 'inbox'"
      :title="searchActive ? `No ${tabLabelLower} match your search.` : `No ${tabLabelLower} yet.`"
      :message="searchActive ? 'Nothing matches.' : ''"
      :action-label="searchActive ? 'Clear search' : ''"
      @action="$emit('clear-search')"
    />
  </div>
</template>

<script>
import BulkActionBar from './BulkActionBar.vue';
import RowItem from './RowItem.vue';
import EmptyState from './EmptyState.vue';

export default {
  name: 'BuildRowList',
  components: { BulkActionBar, RowItem, EmptyState },
  props: {
    tabId: { type: String, required: true },
    tabLabel: { type: String, required: true },
    rows: { type: Array, required: true },
    totalAll: { type: Number, required: true },
    searchActive: { type: Boolean, default: false },
    selectedIds: { type: Array, default: () => [] },
    bulkActions: { type: Array, default: () => [] },
  },
  computed: {
    tabLabelLower() {
      return this.tabLabel.toLowerCase();
    },
    allSelected() {
      return this.rows.length > 0 && this.rows.every((row) => this.selectedIds.includes(row.id));
    },
    indeterminate() {
      return this.selectedIds.length > 0 && !this.allSelected;
    },
  },
  methods: {
    onToggleAll() {
      this.$emit(this.allSelected ? 'clear' : 'select-all');
    },
  },
};
</script>
