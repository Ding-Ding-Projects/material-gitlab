<script>
import { __ } from '~/locale';

export default {
  methods: {
    __,
  },
  name: 'EpicsHeader',
  props: {
    view: { type: String, required: true, validator: (value) => ['tree', 'roadmap'].includes(value) },
    createPath: { type: String, default: '' },
    roadmapPath: { type: String, default: '' },
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
    <a v-if="createPath" class="gl-mds-epics__btn gl-mds-epics__btn--filled" :href="createPath">{{ __('New epic') }}</a>
    <div class="gl-mds-epics__view-toggle" role="group" :aria-label="__('Epics view')">
      <button
        type="button"
        class="gl-mds-epics__view-toggle-btn"
        :aria-pressed="view === 'tree'"
        @click="$emit('change-view', 'tree')"
      >
        {{ treeLabel }}
      </button>
      <a v-if="roadmapPath" class="gl-mds-epics__view-toggle-btn" :href="roadmapPath">{{ roadmapLabel }}</a>
      <button
        v-else
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
