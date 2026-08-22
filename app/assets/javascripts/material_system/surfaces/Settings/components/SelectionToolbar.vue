<template>
  <div class="st-selection-toolbar">
    <label class="st-selection-toolbar__all">
      <input
        ref="selectAll"
        type="checkbox"
        :checked="allSelected"
        :aria-label="`Select all ${visibleCount} visible ${itemNoun}`"
        @change="$emit(selectedCount > 0 ? 'clear' : 'select-all')"
      />
      <span v-if="selectedCount === 0">Select all {{ visibleCount }} visible {{ itemNoun }}</span>
      <span v-else>{{ selectedCount }} selected of {{ visibleCount }} shown</span>
    </label>

    <button v-if="visibleCount > 0" type="button" class="st-selection-toolbar__link" @click="$emit('invert')">
      Invert selection
    </button>

    <div v-if="selectedCount > 0" class="st-selection-toolbar__actions">
      <slot />
      <button type="button" class="st-selection-toolbar__link" @click="$emit('clear')">Clear</button>
    </div>
  </div>
</template>

<script>
export default {
  name: 'SelectionToolbar',
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
.st-selection-toolbar {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 10px 20px;
  border-bottom: 1px solid var(--st-outlv);
  background: var(--st-surfcl);
  font-size: 12.5px;
  color: var(--st-onsurfv);
  flex-wrap: wrap;
}

.st-selection-toolbar__all {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  min-height: var(--st-touch);

  input[type='checkbox'] {
    width: 18px;
    height: 18px;
    accent-color: var(--st-prim);
  }

  input:focus-visible {
    outline: 2px solid var(--st-prim);
    outline-offset: 2px;
  }
}

.st-selection-toolbar__link {
  border: none;
  background: transparent;
  color: var(--st-prim);
  font: inherit;
  font-weight: 600;
  cursor: pointer;
  padding: 6px 4px;

  &:hover {
    text-decoration: underline;
  }
  &:focus-visible {
    outline: 2px solid var(--st-prim);
    outline-offset: 2px;
  }
}

.st-selection-toolbar__actions {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-left: auto;
  flex-wrap: wrap;
}
</style>
