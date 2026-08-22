<template>
  <div class="mgl-pl-bulkbar" role="toolbar" aria-label="Bulk pipeline actions">
    <span>{{ selectedCount }} of {{ totalVisible }} selected</span>
    <div class="mgl-pl-bulk-actions">
      <button type="button" class="mgl-pl-bulk-btn" @click="$emit('invert')">
        <span class="mgl-icon mgl-icon--sm" aria-hidden="true">swap_horiz</span>Invert selection
      </button>
      <button type="button" class="mgl-pl-bulk-btn" @click="$emit('retry')">
        <span class="mgl-icon mgl-icon--sm" aria-hidden="true">replay</span>Retry selected
      </button>
      <button type="button" class="mgl-pl-bulk-btn mgl-pl-bulk-btn--danger" @click="$emit('cancel')">
        <span class="mgl-icon mgl-icon--sm" aria-hidden="true">cancel</span>Cancel selected
      </button>
      <button type="button" class="mgl-pl-bulk-btn mgl-pl-bulk-btn--danger" @click="$emit('delete')">
        <span class="mgl-icon mgl-icon--sm" aria-hidden="true">delete</span>Delete selected
      </button>
      <button type="button" class="mgl-pl-bulk-btn" @click="$emit('clear')">
        <span class="mgl-icon mgl-icon--sm" aria-hidden="true">close</span>Clear
      </button>
    </div>
  </div>
</template>

<script>
export default {
  name: 'PipelinesBulkActionsBar',
  props: {
    selectedCount: { type: Number, required: true },
    totalVisible: { type: Number, required: true },
  },
};
</script>
