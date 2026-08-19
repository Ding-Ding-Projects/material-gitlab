<template>
  <div class="gl-code-card" role="region" :aria-label="`${entityLabelPlural} list`">
    <div v-if="rows.length" class="gl-code-listbar">
      <input
        type="checkbox"
        class="gl-code-checkbox"
        :checked="allSelected"
        :indeterminate.prop="partiallySelected"
        :aria-label="selectAllLabel"
        @change="toggleSelectAll"
      >
      <span>{{ selectAllLabel }}</span>
      <button type="button" class="gl-code-bulkbar__btn" @click="invertSelection">Invert selection</button>
    </div>

    <code-row
      v-for="row in rows"
      :key="row.id"
      :row="row"
      :selected="selectedSet.has(row.id)"
      @toggle="toggleRow"
    />

    <div v-if="!rows.length" class="gl-code-empty">{{ emptyMessage }}</div>

    <bulk-action-bar
      v-if="selectedIds.length"
      :selected-count="selectedIds.length"
      :total-count="rows.length"
      :entity-label-plural="entityLabelPlural"
      :actions="bulkActions"
      @clear="clearSelection"
      @action="onBulkAction"
    />
  </div>
</template>

<script>
import CodeRow from './CodeRow.vue';
import BulkActionBar from './BulkActionBar.vue';

export default {
  name: 'CodeRowList',
  components: { CodeRow, BulkActionBar },
  props: {
    rows: { type: Array, required: true },
    selectedIds: { type: Array, required: true },
    entityLabelPlural: { type: String, required: true },
    emptyMessage: { type: String, default: 'Nothing matches.' },
    bulkActions: { type: Array, default: () => [] },
  },
  computed: {
    selectedSet() {
      return new Set(this.selectedIds);
    },
    visibleSelectedCount() {
      const set = this.selectedSet;
      return this.rows.reduce((count, row) => (set.has(row.id) ? count + 1 : count), 0);
    },
    allSelected() {
      return this.rows.length > 0 && this.visibleSelectedCount === this.rows.length;
    },
    partiallySelected() {
      return this.visibleSelectedCount > 0 && !this.allSelected;
    },
    selectAllLabel() {
      const n = this.rows.length;
      if (this.visibleSelectedCount === 0) return `Select all ${n} ${this.entityLabelPlural} shown`;
      if (this.allSelected) return `All ${n} ${this.entityLabelPlural} shown selected`;
      return `${this.visibleSelectedCount} of ${n} ${this.entityLabelPlural} shown selected`;
    },
  },
  methods: {
    emitSelection(nextSet) {
      this.$emit('update:selected-ids', Array.from(nextSet));
    },
    toggleRow(id) {
      const next = new Set(this.selectedIds);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      this.emitSelection(next);
    },
    toggleSelectAll() {
      const rowIds = this.rows.map((row) => row.id);
      const next = new Set(this.selectedIds);
      if (this.allSelected) rowIds.forEach((id) => next.delete(id));
      else rowIds.forEach((id) => next.add(id));
      this.emitSelection(next);
    },
    invertSelection() {
      const current = this.selectedSet;
      const next = new Set();
      this.rows.forEach((row) => {
        if (!current.has(row.id)) next.add(row.id);
      });
      this.emitSelection(next);
    },
    clearSelection() {
      this.emitSelection(new Set());
    },
    onBulkAction(actionId) {
      this.$emit('bulk-action', actionId, [...this.selectedIds]);
    },
  },
};
</script>
