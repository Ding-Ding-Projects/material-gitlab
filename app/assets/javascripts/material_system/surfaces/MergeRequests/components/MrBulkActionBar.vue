<template>
  <div class="mr-bulk-bar" role="toolbar" aria-label="Bulk actions">
    <span class="mr-bulk-bar__scope">
      {{ selectedCount }} selected of {{ totalCount }} merge requests matching the current filters
    </span>
    <div class="mr-bulk-bar__actions">
      <button type="button" class="mr-bulk-bar__btn" @click="$emit('clear-selection')">Clear selection</button>
      <button
        type="button"
        class="mr-bulk-bar__btn mr-bulk-bar__btn--danger"
        :disabled="!closeableCount"
        @click="$emit('close-selected')"
      >
        Close selected ({{ closeableCount }})
      </button>
    </div>
  </div>
</template>

<script>
export default {
  name: 'MrBulkActionBar',
  props: {
    selectedCount: { type: Number, required: true },
    totalCount: { type: Number, required: true },
    closeableCount: { type: Number, required: true },
  },
};
</script>
