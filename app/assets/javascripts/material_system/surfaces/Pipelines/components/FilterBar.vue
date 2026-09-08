<template>
  <div class="mgl-pl-filterbar" role="group" aria-label="Filter pipelines">
    <material-button variant="text"
      v-for="chip in chips"
      :key="chip.key"
      type="button"
      class="mgl-pl-filter-chip"
      :class="{ 'is-on': chip.on }"
      :aria-pressed="chip.on"
      @click="$emit('toggle', chip.key)"
    >
      <span v-if="chip.on" class="mgl-icon mgl-icon--sm" aria-hidden="true">check</span>
      {{ chip.label }}
    </material-button>
  </div>
</template>

<script>
import MaterialButton from '../../../components/material_button';
import { FILTER_DEFINITIONS } from '../data';

export default {
  components: { MaterialButton },
  name: 'PipelinesFilterBar',
  props: {
    filters: { type: Object, required: true },
  },
  computed: {
    chips() {
      return FILTER_DEFINITIONS.map((def) => ({ ...def, on: Boolean(this.filters[def.key]) }));
    },
  },
};
</script>
