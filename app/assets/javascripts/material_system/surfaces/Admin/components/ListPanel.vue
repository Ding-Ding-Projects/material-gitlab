<template>
  <div :id="`gl-mds-admin-panel-${tab}`" class="gl-mds-admin-list" role="tabpanel" :aria-labelledby="`gl-mds-admin-tab-${tab}`">
    <ListFilterBar
      :value="listQuery"
      :regex-mode="listRegexMode"
      :label="tab"
      :corpus="corpus"
      :result-count="rows.length"
      @input="$emit('update:list-query', $event)"
      @update:regex-mode="$emit('update:list-regex-mode', $event)"
    />

    <div class="gl-mds-admin-card gl-mds-admin-list__card">
      <ListToolbar
        v-if="rows.length"
        :row-count="rows.length"
        :selected-count="selectedIds.length"
        :all-selected="allSelected"
        :some-selected="selectedIds.length > 0"
        :bulk-actions="bulkActions"
        @toggle-select-all="$emit('toggle-select-all')"
        @invert-selection="$emit('invert-selection')"
        @bulk-action="$emit('bulk-action', $event)"
      />

      <ListRow
        v-for="row in rows"
        :key="row.id"
        :row="row"
        :selected="selectedIds.includes(row.id)"
        @toggle-select="$emit('toggle-select', row.id)"
        @action="$emit('row-action', { id: row.id, actionId: $event })"
      />

      <EmptyState
        v-if="!rows.length"
        :label="tab.toLowerCase()"
        :has-filters="Boolean(listQuery) || Boolean(searchQuery)"
        @clear-filters="$emit('clear-filters')"
      />
    </div>
  </div>
</template>

<script>
import ListFilterBar from './ListFilterBar.vue';
import ListToolbar from './ListToolbar.vue';
import ListRow from './ListRow.vue';
import EmptyState from './EmptyState.vue';

export default {
  name: 'ListPanel',
  components: { ListFilterBar, ListToolbar, ListRow, EmptyState },
  props: {
    tab: { type: String, required: true },
    rows: { type: Array, required: true },
    listQuery: { type: String, default: '' },
    listRegexMode: { type: Boolean, default: false },
    searchQuery: { type: String, default: '' },
    corpus: { type: Array, default: () => [] },
    selectedIds: { type: Array, default: () => [] },
    bulkActions: { type: Array, default: () => [] },
  },
  computed: {
    allSelected() {
      return this.rows.length > 0 && this.rows.every((row) => this.selectedIds.includes(row.id));
    },
  },
};
</script>
