<template>
  <div class="dp-selection-bar" role="toolbar" :aria-label="`Bulk actions for ${itemLabelPlural}`">
    <label class="dp-selection-bar__select-all">
      <material-checkbox
        :checked="allSelected"
        :indeterminate="selectedCount > 0 && selectedCount < totalCount"
        :aria-label="selectAllLabel"
        @change="$emit(allSelected ? 'clear' : 'select-all')"
      ></material-checkbox>
      <span>{{ selectAllLabel }}</span>
    </label>
    <material-button type="button" variant="text" class="dp-selection-bar__link" @click="$emit('invert')">Invert selection</material-button>
    <material-button v-if="selectedCount > 0" type="button" variant="text" class="dp-selection-bar__link" @click="$emit('clear')">Clear</material-button>
    <span class="dp-selection-bar__spacer"></span>
    <div v-if="selectedCount > 0" class="dp-selection-bar__actions">
      <slot name="actions" />
    </div>
  </div>
</template>

<script>
import MaterialButton from '../../../components/material_button';
import MaterialCheckbox from '../../../components/material_checkbox';
export default {
  name: 'SelectionBar',
  components: { MaterialButton, MaterialCheckbox },
  props: {
    selectedCount: { type: Number, required: true },
    totalCount: { type: Number, required: true },
    itemLabelPlural: { type: String, default: 'items' },
  },
  computed: {
    allSelected() {
      return this.totalCount > 0 && this.selectedCount === this.totalCount;
    },
    selectAllLabel() {
      if (this.selectedCount === 0) return `Select all ${this.totalCount} matching your search`;
      return `${this.selectedCount} of ${this.totalCount} matching your search selected`;
    },
  },
};
</script>

<style lang="scss" scoped>
.dp-selection-bar {
  display: flex;
  align-items: center;
  gap: 16px;
  flex-wrap: wrap;
  padding: 10px 20px;
  font-size: 12.5px;
  color: var(--dp-onsurfv);
}

.dp-selection-bar__select-all {
  display: flex;
  align-items: center;
  gap: 8px;
  min-height: 24px;
  cursor: pointer;
  color: var(--dp-onsurf);
  font-weight: 500;

  input[type='checkbox'] {
    width: 18px;
    height: 18px;
    accent-color: var(--dp-prim);
    cursor: pointer;

    &:focus-visible {
      outline: 2px solid var(--dp-prim);
      outline-offset: 2px;
    }
  }
}

.dp-selection-bar__link {
  border: none;
  background: none;
  color: var(--dp-prim);
  font: inherit;
  font-size: 12.5px;
  font-weight: 500;
  cursor: pointer;
  padding: 4px 2px;

  &:hover {
    text-decoration: underline;
  }

  &:focus-visible {
    outline: 2px solid var(--dp-prim);
    outline-offset: 2px;
    border-radius: 4px;
  }
}

.dp-selection-bar__spacer {
  flex: 1;
}

.dp-selection-bar__actions {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}
</style>
