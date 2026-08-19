<template>
  <div :id="`${instanceId}-tabpanel`" class="dp-rowlist" role="tabpanel" tabindex="0" :aria-label="`${itemLabelPlural} list`" data-screen-label="Deploy list">
    <SelectionBar
      v-if="rows.length > 0"
      :selected-count="selectedIds.length"
      :total-count="rows.length"
      :item-label-plural="itemLabelPlural"
      @select-all="$emit('select-all')"
      @clear="$emit('clear-selection')"
      @invert="$emit('invert-selection')"
    >
      <template #actions>
        <slot name="bulk-actions" />
      </template>
    </SelectionBar>

    <div class="dp-rowlist__card">
      <DeployRow
        v-for="row in rows"
        :key="row.id"
        :row="row"
        :selected="selectedIds.includes(row.id)"
        @toggle-select="$emit('toggle-select', $event)"
        @act="$emit('act', $event)"
      />
      <p v-if="rows.length === 0" class="dp-rowlist__empty">{{ emptyMessage }}</p>
    </div>
  </div>
</template>

<script>
import DeployRow from './DeployRow.vue';
import SelectionBar from './SelectionBar.vue';

export default {
  name: 'DeployRowList',
  components: { DeployRow, SelectionBar },
  props: {
    rows: { type: Array, required: true },
    selectedIds: { type: Array, default: () => [] },
    itemLabelPlural: { type: String, default: 'items' },
    emptyMessage: { type: String, default: 'Nothing matches.' },
    instanceId: { type: String, default: 'dp' },
  },
};
</script>

<style lang="scss" scoped>
.dp-rowlist {
  flex: 1;
  overflow-y: auto;
  padding: 8px 24px 24px;
}

.dp-rowlist__card {
  background: var(--dp-card);
  border-radius: 20px;
  overflow: hidden;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
  max-width: 980px;
}

.dp-rowlist__empty {
  margin: 0;
  padding: 36px;
  text-align: center;
  color: var(--dp-onsurfv);
  font-size: 13.5px;
}
</style>
