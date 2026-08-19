<script>
import { __ } from '~/locale';

export default {
  name: 'EpicsHeader',
  props: {
    view: { type: String, required: true, validator: (value) => ['tree', 'roadmap'].includes(value) },
  },
  computed: {
    treeLabel() {
      return __('Epic tree');
    },
    roadmapLabel() {
      return __('Roadmap');
    },
  },
};
</script>

<template>
  <div class="gl-mds-epics__header">
    <h1 class="gl-mds-epics__title">{{ __('Epics & roadmap') }}</h1>
    <span class="gl-mds-epics__badge">{{ __('ULTIMATE') }}</span>
    <div class="gl-mds-epics__view-toggle" role="group" :aria-label="__('Epics view')">
      <button
        type="button"
        class="gl-mds-epics__view-toggle-btn"
        :aria-pressed="view === 'tree'"
        @click="$emit('change-view', 'tree')"
      >
        {{ treeLabel }}
      </button>
      <button
        type="button"
        class="gl-mds-epics__view-toggle-btn"
        :aria-pressed="view === 'roadmap'"
        @click="$emit('change-view', 'roadmap')"
      >
        {{ roadmapLabel }}
      </button>
    </div>
  </div>
</template>
