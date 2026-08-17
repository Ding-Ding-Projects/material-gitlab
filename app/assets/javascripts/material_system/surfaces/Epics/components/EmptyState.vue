<script>
import MdsIcon from './MdsIcon.vue';

export default {
  name: 'EmptyState',
  components: { MdsIcon },
  props: {
    icon: { type: String, default: 'search' },
    title: { type: String, required: true },
    text: { type: String, default: '' },
  },
};
</script>

<template>
  <div class="gl-mds-epics__empty" role="status">
    <mds-icon :name="icon" size="lg" />
    <div class="gl-mds-epics__empty-title">{{ title }}</div>
    <p v-if="text" class="gl-mds-epics__empty-text">{{ text }}</p>
    <slot />
  </div>
</template>
