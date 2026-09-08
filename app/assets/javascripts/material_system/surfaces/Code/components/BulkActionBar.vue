<template>
  <div class="gl-code-bulkbar" role="toolbar" :aria-label="`Bulk actions for ${selectedCount} selected ${entityLabelPlural}`">
    <span>{{ selectedCount }} of {{ totalCount }} {{ entityLabelPlural }} selected</span>
    <material-button type="button" variant="text" class="gl-code-bulkbar__btn" @click="$emit('clear')">Clear selection</material-button>
    <div class="gl-code-bulkbar__actions">
      <material-button variant="filled"
        v-for="action in actions"
        :key="action.id"
        type="button"
        class="gl-code-bulkbar__btn"
        :class="{ 'gl-code-bulkbar__btn--danger': action.danger }"
        @click="$emit('action', action.id)"
      >{{ action.label }}</material-button>
    </div>
  </div>
</template>

<script>
import MaterialButton from '../../../components/material_button';

export default {
  name: 'BulkActionBar',
  components: { MaterialButton },
  props: {
    selectedCount: { type: Number, required: true },
    totalCount: { type: Number, required: true },
    entityLabelPlural: { type: String, required: true },
    actions: { type: Array, default: () => [] },
  },
};
</script>
