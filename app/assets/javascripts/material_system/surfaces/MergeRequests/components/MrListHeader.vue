<template>
  <div class="mr-list-header">
    <h1 class="mr-list-header__title">Merge requests</h1>
    <span class="mr-list-header__count">{{ countLabel }}</span>
    <material-button v-if="canCreate && newPath" :href="newPath" variant="filled">New merge request</material-button>
    <material-button variant="filled" v-else-if="canCreate" type="button" class="mr-list-header__new-btn" @click="$emit('create')">
      <span class="material-symbols-outlined" aria-hidden="true">add</span>
      New merge request
    </material-button>
  </div>
</template>

<script>
import MaterialButton from '~/material_system/components/material_button';

export default {
  name: 'MrListHeader',
  components: { MaterialButton },
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
