<script>
import { __, sprintf, n__ } from '~/locale';
import EpicTreeRow from './EpicTreeRow.vue';
import EmptyState from './EmptyState.vue';

export default {
  name: 'EpicTree',
  components: { EpicTreeRow, EmptyState },
  props: {
    rows: { type: Array, required: true },
    totalCount: { type: Number, required: true },
    selectedIds: { type: Array, required: true },
    collapsedIds: { type: Array, required: true },
    hasQuery: { type: Boolean, default: false },
  },
  data() {
    return { activeIndex: 0 };
  },
  computed: {
    selectedSet() {
      return new Set(this.selectedIds);
    },
    collapsedSet() {
      return new Set(this.collapsedIds);
    },
    visibleSelectedCount() {
      return this.rows.filter((row) => this.selectedSet.has(row.id)).length;
    },
    allVisibleSelected() {
      return this.rows.length > 0 && this.visibleSelectedCount === this.rows.length;
    },
    someVisibleSelected() {
      return this.visibleSelectedCount > 0 && !this.allVisibleSelected;
    },
    selectAllLabel() {
      return sprintf(__('Select all %{count} visible epics'), { count: this.rows.length });
    },
    emptyTitle() {
      return this.hasQuery ? __('No epics match your search') : __('No epics yet');
    },
    emptyText() {
      return this.hasQuery
        ? __('Try a different search term, or clear the search to see every epic.')
        : __('Epics you create in this group will show up here.');
    },
  },
  watch: {
    rows(newRows) {
      if (this.activeIndex >= newRows.length) this.activeIndex = Math.max(0, newRows.length - 1);
    },
  },
  methods: {
    rowTabindex(index) {
      return index === this.activeIndex ? 0 : -1;
    },
    isCollapsed(id) {
      return this.collapsedSet.has(id);
    },
    isSelected(id) {
      return this.selectedSet.has(id);
    },
    focusIndex(index) {
      const clamped = Math.max(0, Math.min(index, this.rows.length - 1));
      this.activeIndex = clamped;
      this.$nextTick(() => {
        const refs = this.$refs.rowRefs;
        if (refs && refs[clamped]) refs[clamped].focusRow();
      });
    },
    onRowKeydown(index, event) {
      switch (event.key) {
        case 'ArrowDown':
          event.preventDefault();
          this.focusIndex(index + 1);
          break;
        case 'ArrowUp':
          event.preventDefault();
          this.focusIndex(index - 1);
          break;
        case 'Home':
          event.preventDefault();
          this.focusIndex(0);
          break;
        case 'End':
          event.preventDefault();
          this.focusIndex(this.rows.length - 1);
          break;
        case 'ArrowRight': {
          const row = this.rows[index];
          if (row.hasChildren && this.isCollapsed(row.id)) this.$emit('toggle-collapse', row.id);
          break;
        }
        case 'ArrowLeft': {
          const row = this.rows[index];
          if (row.hasChildren && !this.isCollapsed(row.id)) this.$emit('toggle-collapse', row.id);
          break;
        }
        case ' ':
        case 'Spacebar':
          event.preventDefault();
          this.$emit('toggle-select', this.rows[index].id);
          break;
        default:
          break;
      }
    },
    n(count) {
      return n__('%d epic', '%d epics', count);
    },
  },
};
</script>

<template>
  <div class="gl-mds-epics__card">
    <div v-if="rows.length" class="gl-mds-epics__tree-head">
      <input
        type="checkbox"
        class="gl-mds-epics__checkbox"
        :checked="allVisibleSelected"
        :indeterminate.prop="someVisibleSelected"
        :aria-label="selectAllLabel"
        @change="$emit('select-all-visible', !allVisibleSelected)"
      />
      <span>{{ n(totalCount) }}</span>
      <span v-if="visibleSelectedCount" class="gl-mds-epics__bulkbar-count">{{
        sprintf(__('%{count} selected'), { count: visibleSelectedCount })
      }}</span>
      <button
        v-if="rows.length"
        type="button"
        class="gl-mds-epics__tree-head-action"
        @click="$emit('invert-selection')"
      >
        {{ __('Invert selection') }}
      </button>
    </div>
    <div
      v-if="rows.length"
      role="tree"
      :aria-label="__('Epic tree')"
      aria-multiselectable="true"
    >
      <epic-tree-row
        v-for="(row, index) in rows"
        ref="rowRefs"
        :key="row.id"
        :epic-item="row"
        :selected="isSelected(row.id)"
        :collapsed="isCollapsed(row.id)"
        :tabindex="rowTabindex(index)"
        @toggle-collapse="$emit('toggle-collapse', $event)"
        @toggle-select="$emit('toggle-select', $event)"
        @row-keydown="onRowKeydown(index, $event)"
      />
    </div>
    <empty-state v-else :icon="hasQuery ? 'search' : 'flag'" :title="emptyTitle" :text="emptyText" />
  </div>
</template>
