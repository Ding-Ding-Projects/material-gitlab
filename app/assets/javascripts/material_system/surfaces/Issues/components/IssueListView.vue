<template>
  <main class="gl-mds-list-view">
    <div class="gl-mds-list-view__card">
      <div v-if="issues.length" class="gl-mds-list-view__header">
        <label class="gl-mds-list-view__select-all">
          <input
            ref="selectAllInput"
            type="checkbox"
            :checked="allSelected"
            aria-label="Select all issues matching your filters"
            @change="$emit(allSelected ? 'clear-selection' : 'select-all')"
          />
          <span>{{ selectAllLabel }}</span>
        </label>
      </div>
      <ul class="gl-mds-list-view__rows">
        <issue-row
          v-for="issue in issues"
          :key="issue.id"
          :issue="issue"
          :selected="selectedIds.includes(issue.id)"
          @open="$emit('open', $event)"
          @toggle-select="$emit('toggle-select', $event)"
        />
      </ul>
      <div v-if="!issues.length" class="gl-mds-list-view__empty">
        No issues match your filters.
      </div>
    </div>
  </main>
</template>

<script>
import IssueRow from './IssueRow.vue';

export default {
  name: 'IssueListView',
  components: { IssueRow },
  props: {
    issues: { type: Array, required: true },
    selectedIds: { type: Array, default: () => [] },
  },
  computed: {
    allSelected() {
      return this.issues.length > 0 && this.issues.every((issue) => this.selectedIds.includes(issue.id));
    },
    partiallySelected() {
      return !this.allSelected && this.issues.some((issue) => this.selectedIds.includes(issue.id));
    },
    selectAllLabel() {
      const selectedInView = this.issues.filter((issue) => this.selectedIds.includes(issue.id)).length;
      return `Select all — ${selectedInView} of ${this.issues.length} matching your filters selected`;
    },
  },
  watch: {
    partiallySelected: {
      immediate: true,
      handler(value) {
        this.$nextTick(() => {
          if (this.$refs.selectAllInput) this.$refs.selectAllInput.indeterminate = value;
        });
      },
    },
  },
};
</script>

<style scoped lang="scss">
.gl-mds-list-view {
  flex: 1;
  overflow-y: auto;
  padding: 0 24px 24px;
}

.gl-mds-list-view__card {
  background: var(--gl-mds-card);
  border-radius: 20px;
  overflow: hidden;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
}

.gl-mds-list-view__header {
  padding: 10px 20px;
  border-bottom: 1px solid var(--gl-mds-outlv);
}

.gl-mds-list-view__select-all {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12.5px;
  color: var(--gl-mds-onsurfv);
  cursor: pointer;
}

.gl-mds-list-view__rows {
  margin: 0;
  padding: 0;
}

.gl-mds-list-view__empty {
  padding: 36px;
  text-align: center;
  color: var(--gl-mds-onsurfv);
  font-size: 13.5px;
}
</style>
