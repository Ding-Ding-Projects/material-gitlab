<script>
import { TODO_VIEWS } from '../data';

/**
 * Multi-select toolbar shared by every list on this surface: a scope-honest
 * select-all, an inverse-selection action, and the one bulk action that is
 * valid for the current view (to-dos have no destructive bulk action).
 */
export default {
  name: 'TodosSelectionBar',
  props: {
    view: {
      type: String,
      default: TODO_VIEWS.PENDING,
    },
    selectedCount: {
      type: Number,
      default: 0,
    },
    visibleCount: {
      type: Number,
      default: 0,
    },
    allSelected: {
      type: Boolean,
      default: false,
    },
  },
  computed: {
    selectAllState() {
      if (this.selectedCount === 0) return false;
      return this.allSelected ? true : 'indeterminate';
    },
    bulkActionLabel() {
      const noun = this.selectedCount === 1 ? 'to-do' : 'to-dos';
      return this.view === TODO_VIEWS.PENDING
        ? `Mark ${this.selectedCount} ${noun} as done`
        : `Restore ${this.selectedCount} ${noun}`;
    },
  },
  methods: {
    onSelectAllChange(event) {
      if (event.target.checked) this.$emit('select-all');
      else this.$emit('clear-selection');
    },
  },
};
</script>

<template>
  <div class="md-todos__selection-bar">
    <label class="md-todos__select-all">
      <input
        type="checkbox"
        :checked="allSelected && visibleCount > 0"
        :indeterminate.prop="selectAllState === 'indeterminate'"
        :disabled="visibleCount === 0"
        aria-label="Select all visible to-dos"
        @change="onSelectAllChange"
      />
      <span v-if="selectedCount > 0">{{ selectedCount }} selected of {{ visibleCount }} visible</span>
      <span v-else>Select all {{ visibleCount }} visible</span>
    </label>

    <button
      type="button"
      class="md-todos__link-button"
      :disabled="visibleCount === 0"
      @click="$emit('invert-selection')"
    >
      Invert selection
    </button>

    <div class="md-todos__selection-actions">
      <button
        v-if="selectedCount > 0"
        type="button"
        class="md-todos__link-button"
        @click="$emit('clear-selection')"
      >
        Cancel selection
      </button>
      <button
        type="button"
        class="md-todos__bulk-action"
        :disabled="selectedCount === 0"
        @click="view === 'pending' ? $emit('bulk-mark-done') : $emit('bulk-restore')"
      >
        {{ bulkActionLabel }}
      </button>
    </div>
  </div>
</template>
