<template>
  <div class="mgl-pl-list-card">
    <div v-if="pipelines.length" class="mgl-pl-list-head">
      <input
        ref="selectAll"
        type="checkbox"
        class="mgl-pl-row-check"
        :checked="allSelected"
        aria-label="Select all pipelines matching the current filters"
        @change="$emit('toggle-select-all')"
      />
      <span>{{ selectAllLabel }}</span>
    </div>
    <ul class="mgl-pl-list" role="list" aria-label="Pipelines">
      <pipeline-row
        v-for="pl in pipelines"
        :key="pl.id"
        :pipeline="pl"
        :selected="selectedIds.includes(pl.id)"
        @open="$emit('open', $event)"
        @toggle-select="$emit('toggle-select', $event)"
      />
    </ul>
    <div v-if="!pipelines.length" class="mgl-pl-empty">No pipelines match your filters.</div>
  </div>
</template>

<script>
import PipelineRow from './PipelineRow.vue';

export default {
  name: 'PipelinesList',
  components: { PipelineRow },
  props: {
    pipelines: { type: Array, required: true },
    selectedIds: { type: Array, required: true },
  },
  computed: {
    allSelected() {
      return this.pipelines.length > 0 && this.pipelines.every((pl) => this.selectedIds.includes(pl.id));
    },
    someSelected() {
      return !this.allSelected && this.pipelines.some((pl) => this.selectedIds.includes(pl.id));
    },
    selectAllLabel() {
      if (this.allSelected) return `All ${this.pipelines.length} pipelines matching the current filters are selected`;
      const selectedHere = this.pipelines.filter((pl) => this.selectedIds.includes(pl.id)).length;
      if (selectedHere > 0) return `${selectedHere} of ${this.pipelines.length} selected — select all matching the current filters`;
      return `Select all ${this.pipelines.length} pipelines matching the current filters`;
    },
  },
  watch: {
    someSelected: {
      immediate: true,
      handler(value) {
        this.$nextTick(() => {
          if (this.$refs.selectAll) this.$refs.selectAll.indeterminate = value;
        });
      },
    },
  },
};
</script>
