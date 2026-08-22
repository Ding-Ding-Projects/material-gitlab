<template>
  <div class="mr-filter-chips" role="group" aria-label="Filter merge requests">
    <button
      v-for="def in filterDefs"
      :key="def.key"
      type="button"
      class="mr-filter-chip"
      :data-active="filters[def.key]"
      :aria-pressed="filters[def.key] ? 'true' : 'false'"
      @click="$emit('toggle', def.key)"
    >
      <span v-if="filters[def.key]" class="material-symbols-outlined mr-filter-chip__check" aria-hidden="true">
        check
      </span>
      {{ def.label }}
    </button>
  </div>
</template>

<script>
import { FILTER_DEFS } from '../data';

export default {
  name: 'MrFilterChips',
  props: {
    filters: { type: Object, required: true },
  },
  data() {
    return { filterDefs: FILTER_DEFS };
  },
};
</script>
