<template>
  <div class="gl-code-bulkbar" role="toolbar" :aria-label="`Bulk actions for ${selectedCount} selected ${entityLabelPlural}`">
    <span>{{ selectedCount }} of {{ totalCount }} {{ entityLabelPlural }} selected</span>
    <button type="button" class="gl-code-bulkbar__btn" @click="$emit('clear')">Clear selection</button>
    <div class="gl-code-bulkbar__actions">
      <button
        v-for="action in actions"
        :key="action.id"
        type="button"
        class="gl-code-bulkbar__btn"
        :class="{ 'gl-code-bulkbar__btn--danger': action.danger }"
        @click="$emit('action', action.id)"
      >{{ action.label }}</button>
    </div>
  </div>
</template>

<script>
export default {
  name: 'BulkActionBar',
  props: {
    selectedCount: { type: Number, required: true },
    totalCount: { type: Number, required: true },
    entityLabelPlural: { type: String, required: true },
    actions: { type: Array, default: () => [] },
  },
};
</script>
