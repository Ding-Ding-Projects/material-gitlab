<template>
  <div class="mr-list">
    <template v-if="mrs.length">
      <div class="mr-list__head">
        <label class="mr-list__head-label">
          <input
            type="checkbox"
            :checked="allSelected"
            :indeterminate.prop="someSelected && !allSelected"
            aria-label="Select all merge requests matching the current filters"
            @change="$emit(allSelected ? 'select-none' : 'select-all')"
          />
          {{ scopeLabel }}
        </label>
        <button type="button" class="mr-list__invert-btn" @click="$emit('invert-selection')">
          Invert selection
        </button>
      </div>
      <mr-list-item
        v-for="mr in mrs"
        :key="mr.id"
        :mr="mr"
        :selected="selectedIds.includes(mr.id)"
        @toggle-select="$emit('toggle-select', $event)"
        @open="$emit('open', $event)"
      />
    </template>
    <div v-else class="mr-list__empty">No merge requests match your filters.</div>
  </div>
</template>

<script>
import MrListItem from './MrListItem.vue';

export default {
  name: 'MrList',
  components: { MrListItem },
  props: {
    mrs: { type: Array, required: true },
    selectedIds: { type: Array, required: true },
  },
  computed: {
    allSelected() {
      return this.mrs.length > 0 && this.mrs.every((mr) => this.selectedIds.includes(mr.id));
    },
    someSelected() {
      return this.mrs.some((mr) => this.selectedIds.includes(mr.id));
    },
    scopeLabel() {
      const selectedInView = this.mrs.filter((mr) => this.selectedIds.includes(mr.id)).length;
      return `${selectedInView} of ${this.mrs.length} selected (matching current filters)`;
    },
  },
};
</script>
