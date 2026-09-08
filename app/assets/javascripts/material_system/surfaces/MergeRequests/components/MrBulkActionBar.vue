<template>
  <div class="mr-bulk-bar" role="toolbar" aria-label="Bulk actions">
    <span class="mr-bulk-bar__scope">
      {{ selectedCount }} selected of {{ totalCount }} merge requests matching the current filters
    </span>
    <div class="mr-bulk-bar__actions">
      <material-button variant="text" type="button" class="mr-bulk-bar__btn" @click="$emit('clear-selection')">Clear selection</material-button>
      <material-button variant="text"
        type="button"
        class="mr-bulk-bar__btn mr-bulk-bar__btn--danger"
        :disabled="!closeableCount"
        @click="$emit('close-selected')"
      >
        Close selected ({{ closeableCount }})
      </material-button>
    </div>
  </div>
</template>

<script>
import MaterialButton from '~/material_system/components/material_button';

export default {
  components: { MaterialButton },
  name: 'MrBulkActionBar',
  props: {
    selectedCount: { type: Number, required: true },
    totalCount: { type: Number, required: true },
    closeableCount: { type: Number, required: true },
  },
};
</script>
