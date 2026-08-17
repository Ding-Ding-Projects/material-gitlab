<template>
  <div class="bulk-bar">
    <label class="bulk-bar__select-all">
      <input
        ref="selectAll"
        type="checkbox"
        :checked="allSelected"
        :aria-label="selectAllLabel"
        @change="$emit('toggle-all')"
      />
      <span>{{ selectedCount > 0 ? `${selectedCount} selected` : selectAllLabel }}</span>
    </label>
    <button type="button" class="bulk-bar__link" @click="$emit('invert')">Invert selection</button>
    <button v-if="selectedCount > 0" type="button" class="bulk-bar__link" @click="$emit('clear')">Clear selection</button>
    <div class="bulk-bar__spacer"></div>
    <button
      v-for="action in actions"
      :key="action.id"
      type="button"
      class="bulk-bar__action"
      :class="{ 'bulk-bar__action--destructive': action.destructive }"
      @click="action.run"
    >{{ action.label }}</button>
  </div>
</template>

<script>
export default {
  name: 'BuildBulkActionBar',
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
  watch: {
    indeterminate: {
      immediate: true,
      handler(value) {
        this.$nextTick(() => {
          if (this.$refs.selectAll) this.$refs.selectAll.indeterminate = value;
        });
      },
    },
  },
  updated() {
    if (this.$refs.selectAll) this.$refs.selectAll.indeterminate = this.indeterminate;
  },
};
</script>
