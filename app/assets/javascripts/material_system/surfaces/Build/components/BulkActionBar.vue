<template>
  <div class="bulk-bar">
    <label class="bulk-bar__select-all">
      <material-checkbox
        :checked="allSelected"
        :indeterminate="indeterminate"
        :aria-label="selectAllLabel"
        @change="$emit('toggle-all')"
      ></material-checkbox>
      <span>{{ selectedCount > 0 ? `${selectedCount} selected` : selectAllLabel }}</span>
    </label>
    <material-button type="button" variant="text" class="bulk-bar__link" @click="$emit('invert')">Invert selection</material-button>
    <material-button v-if="selectedCount > 0" type="button" variant="text" class="bulk-bar__link" @click="$emit('clear')">Clear selection</material-button>
    <div class="bulk-bar__spacer"></div>
    <material-button
      v-for="action in actions"
      :key="action.id"
      type="button"
      variant="text" class="bulk-bar__action"
      :class="{ 'bulk-bar__action--destructive': action.destructive }"
      @click="action.run"
    >{{ action.label }}</material-button>
  </div>
</template>

<script>
import MaterialButton from '../../../components/material_button';
import MaterialCheckbox from '../../../components/material_checkbox';
export default {
  name: 'BuildBulkActionBar',
  components: { MaterialButton, MaterialCheckbox },
  props: {
    totalVisible: { type: Number, required: true },
    totalAll: { type: Number, required: true },
    searchActive: { type: Boolean, default: false },
    tabLabel: { type: String, required: true },
    selectedCount: { type: Number, required: true },
    allSelected: { type: Boolean, default: false },
    indeterminate: { type: Boolean, default: false },
    actions: { type: Array, default: () => [] },
  },
  computed: {
    selectAllLabel() {
      const noun = this.tabLabel.toLowerCase();
      return this.searchActive
        ? `Select all ${this.totalVisible} matching ${noun}`
        : `Select all ${this.totalAll} ${noun}`;
    },
  },
};
</script>
