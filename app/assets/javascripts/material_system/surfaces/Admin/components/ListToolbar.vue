<template>
  <div class="gl-mds-admin-toolbar">
    <label class="gl-mds-admin-toolbar__select-all">
      <input
        ref="selectAll"
        type="checkbox"
        :checked="allSelected"
        aria-label="Select all rows matching the current filter"
        @change="$emit('toggle-select-all')"
      />
      <span>{{ selectAllLabel }}</span>
    </label>
    <button
      type="button"
      class="gl-mds-admin-btn gl-mds-admin-btn--text gl-mds-admin-btn--sm"
      :disabled="!rowCount"
      @click="$emit('invert-selection')"
    >
      Invert selection
    </button>
    <div class="gl-mds-admin-toolbar__spacer"></div>
    <template v-if="selectedCount">
      <span class="gl-mds-admin-toolbar__count" role="status">{{ selectedCount }} selected</span>
      <button
        v-for="action in bulkActions"
        :key="action.id"
        type="button"
        class="gl-mds-admin-btn gl-mds-admin-btn--sm"
        :class="action.tone === 'danger' ? 'gl-mds-admin-btn--danger' : 'gl-mds-admin-btn--tonal'"
        @click="$emit('bulk-action', action)"
      >
        {{ action.label }}
      </button>
    </template>
  </div>
</template>

<script>
export default {
  name: 'ListToolbar',
  props: {
    rowCount: { type: Number, required: true },
    selectedCount: { type: Number, required: true },
    allSelected: { type: Boolean, required: true },
    someSelected: { type: Boolean, required: true },
    bulkActions: { type: Array, required: true },
  },
  computed: {
    selectAllLabel() {
      if (!this.rowCount) return 'No rows to select';
      return this.allSelected ? `All ${this.rowCount} filtered selected` : `Select all ${this.rowCount} filtered`;
    },
  },
  watch: {
    someSelected: {
      immediate: true,
      handler(value) {
        this.$nextTick(() => {
          if (this.$refs.selectAll) this.$refs.selectAll.indeterminate = value && !this.allSelected;
        });
      },
    },
    allSelected() {
      this.$nextTick(() => {
        if (this.$refs.selectAll) this.$refs.selectAll.indeterminate = this.someSelected && !this.allSelected;
      });
    },
  },
};
</script>
