<template>
  <div class="mg-selection-toolbar">
    <label class="mg-selection-toolbar__all">
      <input
        ref="selectAll"
        type="checkbox"
        :checked="allSelected"
        :aria-label="`Select all ${visibleCount} visible ${itemNoun}`"
        @change="$emit(allSelected ? 'clear' : 'select-all')"
      />
      <span v-if="selectedCount === 0">Select all {{ visibleCount }} visible</span>
      <span v-else>{{ selectedCount }} selected of {{ visibleCount }} shown</span>
    </label>

    <button
      v-if="visibleCount > 0"
      type="button"
      class="mg-selection-toolbar__link"
      @click="$emit('invert')"
    >
      Invert selection
    </button>

    <div v-if="selectedCount > 0" class="mg-selection-toolbar__actions">
      <slot />
      <button type="button" class="mg-selection-toolbar__link" @click="$emit('clear')">Clear</button>
    </div>
  </div>
</template>

<script>
export default {
  name: 'MgSelectionToolbar',
  props: {
    visibleCount: { type: Number, required: true },
    selectedCount: { type: Number, required: true },
    itemNoun: { type: String, default: 'items' },
  },
  computed: {
    allSelected() {
      return this.visibleCount > 0 && this.selectedCount === this.visibleCount;
    },
    someSelected() {
      return this.selectedCount > 0 && this.selectedCount < this.visibleCount;
    },
  },
  watch: {
    someSelected: {
      immediate: true,
      handler(value) {
        this.$nextTick(() => {
          if (this.$refs.selectAll) this.$refs.selectAll.indeterminate = value;
        });
      },
    },
  },
};
</script>

<style lang="scss" scoped>
.mg-selection-toolbar {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 10px 20px;
  border-bottom: 1px solid var(--mg-outlv);
  background: var(--mg-surfcl);
  font-size: 12.5px;
  color: var(--mg-onsurfv);
  flex-wrap: wrap;
}

.mg-selection-toolbar__all {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  min-height: var(--mg-touch);

  input[type='checkbox'] {
    width: 18px;
    height: 18px;
    accent-color: var(--mg-prim);
  }

  input:focus-visible {
    outline: 2px solid var(--mg-prim);
    outline-offset: 2px;
  }
}

.mg-selection-toolbar__link {
  border: none;
  background: transparent;
  color: var(--mg-prim);
  font: inherit;
  font-weight: 600;
  cursor: pointer;
  padding: 6px 4px;

  &:hover {
    text-decoration: underline;
  }
  &:focus-visible {
    outline: 2px solid var(--mg-prim);
    outline-offset: 2px;
  }
}

.mg-selection-toolbar__actions {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-left: auto;
}
</style>
