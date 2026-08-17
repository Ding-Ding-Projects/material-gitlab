<template>
  <div class="gl-mds-admin-empty" role="status">
    <Icon name="search" :size="28" class="gl-mds-admin-empty__icon" />
    <p class="gl-mds-admin-empty__text">{{ text }}</p>
    <button v-if="hasFilters" type="button" class="gl-mds-admin-btn gl-mds-admin-btn--text" @click="$emit('clear-filters')">
      Clear filters
    </button>
  </div>
</template>

<script>
import Icon from './Icon.vue';

export default {
  name: 'EmptyState',
  components: { Icon },
  props: {
    label: { type: String, required: true },
    hasFilters: { type: Boolean, default: false },
  },
  computed: {
    text() {
      return this.hasFilters
        ? `No ${this.label} match your search or filter.`
        : `There are no ${this.label} yet.`;
    },
  },
};
</script>
