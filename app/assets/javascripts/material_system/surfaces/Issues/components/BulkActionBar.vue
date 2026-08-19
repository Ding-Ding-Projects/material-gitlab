<template>
  <div class="gl-mds-bulkbar" role="toolbar" aria-label="Bulk issue actions">
    <span class="gl-mds-bulkbar__summary">{{ selectAllLabel }}</span>
    <div class="gl-mds-bulkbar__actions">
      <button type="button" class="gl-mds-bulkbar__action" @click="$emit('close-selected')">
        <mds-icon name="check-circle" size="sm" />Close
      </button>
      <button type="button" class="gl-mds-bulkbar__action" @click="$emit('reopen-selected')">
        <mds-icon name="undo" size="sm" />Reopen
      </button>
      <button type="button" class="gl-mds-bulkbar__action gl-mds-bulkbar__action--danger" @click="$emit('delete-selected')">
        <mds-icon name="delete" size="sm" />Delete
      </button>
      <button type="button" class="gl-mds-bulkbar__clear" @click="$emit('clear')">Clear selection</button>
    </div>
  </div>
</template>

<script>
import MdsIcon from './MdsIcon.vue';

export default {
  name: 'BulkActionBar',
  components: { MdsIcon },
  props: {
    selectedCount: { type: Number, required: true },
    totalCount: { type: Number, required: true },
  },
  computed: {
    selectAllLabel() {
      return `${this.selectedCount} selected of ${this.totalCount} matching your filters`;
    },
  },
};
</script>

<style scoped lang="scss">
.gl-mds-bulkbar {
  display: flex;
  align-items: center;
  gap: 16px;
  flex-wrap: wrap;
  padding: 10px 16px;
  margin: 0 24px;
  border-radius: 14px;
  background: var(--gl-mds-primc);
  color: var(--gl-mds-onprimc);
  font-size: 13px;
}

.gl-mds-bulkbar__summary {
  font-weight: 500;
}

.gl-mds-bulkbar__actions {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-left: auto;
}

.gl-mds-bulkbar__action {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 7px 14px;
  border-radius: 999px;
  border: none;
  background: var(--gl-mds-card);
  color: var(--gl-mds-onsurf);
  font: inherit;
  font-size: 12.5px;
  font-weight: 500;
  cursor: pointer;

  &--danger { color: var(--gl-mds-err); }

  &:hover { background: var(--gl-mds-surfcl); }

  &:focus-visible {
    outline: 2px solid var(--gl-mds-prim);
    outline-offset: 2px;
  }
}

.gl-mds-bulkbar__clear {
  background: none;
  border: none;
  color: var(--gl-mds-onprimc);
  font: inherit;
  font-size: 12.5px;
  cursor: pointer;
  text-decoration: underline;

  &:focus-visible {
    outline: 2px solid var(--gl-mds-prim);
    outline-offset: 2px;
  }
}
</style>
