<template>
  <div
    :id="`secure-panel-${activeTabId}`"
    class="secure-panel"
    role="tabpanel"
    :aria-labelledby="`secure-tab-${activeTabId}`"
    :aria-busy="loading"
  >
    <div v-if="rows.length > 0" class="secure-panel__toolbar">
      <label class="secure-panel__select-all">
        <input
          ref="selectAll"
          type="checkbox"
          class="secure-row__checkbox"
          :checked="selectAllState === 'all'"
          @change="$emit('toggle-select-all')"
        />
        {{ selectAllLabel }}
      </label>
      <button v-if="selectedIds.length > 0" type="button" class="secure-panel__bulk-action" @click="$emit('invert-selection')">
        Invert selection
      </button>
      <button v-if="selectedIds.length > 0" type="button" class="secure-panel__bulk-action" @click="$emit('clear-selection')">
        Clear selection
      </button>
      <div v-if="selectedIds.length > 0" class="secure-panel__bulk-actions">
        <button
          v-for="action in bulkActions"
          :key="action.id"
          type="button"
          class="secure-panel__bulk-action"
          :class="{ 'secure-panel__bulk-action--destructive': action.destructive }"
          @click="$emit('bulk-action', action.id)"
        >
          {{ action.label }} ({{ selectedIds.length }})
        </button>
      </div>
    </div>
    <div v-if="loading" class="secure-loading" role="status" aria-live="polite">Loading {{ tabLabel.toLowerCase() }}…</div>
    <div v-else-if="error" class="secure-error" role="alert">
      {{ error }}
      <div>
        <button type="button" class="secure-error__retry" @click="$emit('retry')">Retry</button>
      </div>
    </div>
    <ul v-else-if="rows.length > 0" class="secure-panel__list">
      <secure-list-row
        v-for="row in rows"
        :key="row.id"
        :row="row"
        :selected="selectedIds.includes(row.id)"
        @toggle-select="$emit('toggle-select', $event)"
        @action="$emit('row-action', $event)"
      />
    </ul>
    <div v-else class="secure-empty">
      Nothing matches.
      <div v-if="searchActive" class="secure-empty__hint">
        No {{ tabLabel.toLowerCase() }} match your search.
        <div>
          <button type="button" class="secure-empty__clear" @click="$emit('clear-search')">Clear search</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import SecureListRow from './SecureListRow.vue';

export default {
  name: 'SecureListPanel',
  components: { SecureListRow },
  props: {
    activeTabId: { type: String, required: true },
    tabLabel: { type: String, required: true },
    rows: { type: Array, required: true },
    selectedIds: { type: Array, required: true },
    bulkActions: { type: Array, default: () => [] },
    loading: { type: Boolean, default: false },
    error: { type: String, default: null },
    searchActive: { type: Boolean, default: false },
  },
  computed: {
    selectAllState() {
      if (this.rows.length === 0 || this.selectedIds.length === 0) return 'none';
      const selectedOnScreen = this.rows.filter((row) => this.selectedIds.includes(row.id));
      if (selectedOnScreen.length === this.rows.length) return 'all';
      return 'some';
    },
    selectAllLabel() {
      if (this.selectedIds.length === 0) return `Select all ${this.rows.length} shown`;
      return `${this.selectedIds.length} of ${this.rows.length} shown selected`;
    },
  },
  watch: {
    selectAllState: {
      immediate: true,
      handler(state) {
        this.$nextTick(() => {
          if (this.$refs.selectAll) this.$refs.selectAll.indeterminate = state === 'some';
        });
      },
    },
  },
};
</script>
