<template>
  <div class="gl-mds-plan__bulkbar" role="toolbar" :aria-label="`Bulk ${tabLabel.toLowerCase()} actions`">
    <span class="gl-mds-plan__bulkbar-summary">{{ summary }}</span>
    <div class="gl-mds-plan__bulkbar-actions">
      <button
        v-for="action in actions"
        :key="action.id"
        type="button"
        class="gl-mds-plan__bulkbar-action"
        :class="{ 'gl-mds-plan__bulkbar-action--danger': action.danger }"
        @click="$emit('run', action.id)"
      >
        <mds-icon :name="action.icon" size="sm" />{{ action.label }}
      </button>
      <button type="button" class="gl-mds-plan__bulkbar-clear" @click="$emit('clear')">Clear selection</button>
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
    tabLabel: { type: String, required: true },
    actions: { type: Array, required: true },
  },
  computed: {
    summary() {
      return `${this.selectedCount} of ${this.totalCount} visible ${this.tabLabel.toLowerCase()} selected`;
    },
  },
};
</script>

<style scoped lang="scss">
.gl-mds-plan__bulkbar {
  display: flex;
  align-items: center;
  gap: 16px;
  flex-wrap: wrap;
  padding: 10px 16px;
  border-radius: 14px;
  background: var(--gl-mds-primc);
  color: var(--gl-mds-onprimc);
  font-size: 13px;
}

.gl-mds-plan__bulkbar-summary {
  font-weight: 500;
}

.gl-mds-plan__bulkbar-actions {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-left: auto;
  flex-wrap: wrap;
}

.gl-mds-plan__bulkbar-action {
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
  &:focus-visible { outline: 2px solid var(--gl-mds-prim); outline-offset: 2px; }
}

.gl-mds-plan__bulkbar-clear {
  background: none;
  border: none;
  color: var(--gl-mds-onprimc);
  font: inherit;
  font-size: 12.5px;
  cursor: pointer;
  text-decoration: underline;

  &:focus-visible { outline: 2px solid var(--gl-mds-prim); outline-offset: 2px; }
}
</style>
