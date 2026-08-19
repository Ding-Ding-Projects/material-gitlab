<template>
  <div class="gl-mds-plan__list-wrap" :id="`gl-mds-plan-panel-${tabLabel}`" role="tabpanel" :aria-labelledby="`gl-mds-plan-tab-${tabLabel}`">
    <bulk-action-bar
      v-if="selectedIds.length > 0"
      :selected-count="selectedIds.length"
      :total-count="rows.length"
      :tab-label="tabLabel"
      :actions="bulkActions"
      @run="$emit('bulk-action', $event)"
      @clear="$emit('clear-selection')"
    />
    <div class="gl-mds-plan__card">
      <div v-if="rows.length > 0" class="gl-mds-plan__select-all">
        <select-checkbox :checked="allSelected" :indeterminate="someSelected" :label="selectAllLabel" @change="onSelectAllChange" />
        <span class="gl-mds-plan__select-all-label">{{ selectAllLabel }}</span>
        <button v-if="selectedIds.length > 0" type="button" class="gl-mds-plan__invert" @click="$emit('invert-selection')">
          Invert selection
        </button>
      </div>
      <div role="list" :aria-label="`${tabLabel} list`">
        <record-row
          v-for="row in rows"
          :key="row.id"
          :row="row"
          :selected="selectedIds.includes(row.id)"
          @toggle-select="$emit('toggle-select', $event)"
        />
      </div>
      <div v-if="rows.length === 0" class="gl-mds-plan__empty">Nothing matches.</div>
    </div>
  </div>
</template>

<script>
import RecordRow from './RecordRow.vue';
import SelectCheckbox from './SelectCheckbox.vue';
import BulkActionBar from './BulkActionBar.vue';

export default {
  name: 'RecordList',
  components: { RecordRow, SelectCheckbox, BulkActionBar },
  props: {
    rows: { type: Array, required: true },
    selectedIds: { type: Array, required: true },
    tabLabel: { type: String, required: true },
    bulkActions: { type: Array, required: true },
  },
  computed: {
    allSelected() {
      return this.rows.length > 0 && this.selectedIds.length === this.rows.length;
    },
    someSelected() {
      return this.selectedIds.length > 0 && this.selectedIds.length < this.rows.length;
    },
    selectAllLabel() {
      if (this.selectedIds.length === 0) return `Select all ${this.rows.length} visible ${this.tabLabel.toLowerCase()}`;
      return `${this.selectedIds.length} of ${this.rows.length} visible ${this.tabLabel.toLowerCase()} selected`;
    },
  },
  methods: {
    onSelectAllChange(checked) {
      this.$emit(checked ? 'select-all' : 'clear-selection');
    },
  },
};
</script>

<style scoped lang="scss">
.gl-mds-plan__list-wrap {
  display: flex;
  flex-direction: column;
  gap: 10px;
  max-width: 980px;
}

.gl-mds-plan__card {
  background: var(--gl-mds-card);
  border-radius: 20px;
  overflow: hidden;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
}

.gl-mds-plan__select-all {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 6px 16px;
  border-bottom: 1px solid var(--gl-mds-outlv);
}

.gl-mds-plan__select-all-label {
  font-size: 12px;
  color: var(--gl-mds-onsurfv);
  flex: 1;
}

.gl-mds-plan__invert {
  background: none;
  border: none;
  color: var(--gl-mds-onprimc);
  font: inherit;
  font-size: 12px;
  cursor: pointer;
  text-decoration: underline;

  &:focus-visible { outline: 2px solid var(--gl-mds-prim); outline-offset: 2px; }
}

.gl-mds-plan__empty {
  padding: 36px;
  text-align: center;
  color: var(--gl-mds-onsurfv);
  font-size: 13.5px;
}
</style>
