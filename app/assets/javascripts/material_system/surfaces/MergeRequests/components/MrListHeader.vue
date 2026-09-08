<template>
  <div class="mr-list-header">
    <h1 class="mr-list-header__title">Merge requests</h1>
    <span class="mr-list-header__count">{{ countLabel }}</span>
    <gl-button v-if="canCreate && newPath" :href="newPath" variant="confirm">New merge request</gl-button>
    <button v-else-if="canCreate" type="button" class="mr-list-header__new-btn" @click="$emit('create')">
      <span class="material-symbols-outlined" aria-hidden="true">add</span>
      New merge request
    </button>
  </div>
</template>

<script>
import { GlButton } from '@gitlab/ui';
export default {
  name: 'MrListHeader',
  components: { GlButton },
  props: {
    count: { type: Number, required: true },
    canCreate: { type: Boolean, default: true },
    newPath: { type: String, default: '' },
  },
  computed: {
    countLabel() {
      return `${this.count} merge request${this.count === 1 ? '' : 's'} on this page`;
    },
  },
};
</script>
