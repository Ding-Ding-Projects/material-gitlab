<template>
  <div class="gl-mds-admin-empty" role="status">
    <Icon name="search" :size="28" class="gl-mds-admin-empty__icon" />
    <p class="gl-mds-admin-empty__text">{{ text }}</p>
    <material-button v-if="hasFilters" variant="text" type="button" class="gl-mds-admin-btn gl-mds-admin-btn--text" @click="$emit('clear-filters')">
      Clear filters
    </material-button>
  </div>
</template>

<script>
import Icon from './Icon.vue';
import MaterialButton from '../../../components/material_button';

export default {
  name: 'EmptyState',
  components: { Icon, MaterialButton },
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
