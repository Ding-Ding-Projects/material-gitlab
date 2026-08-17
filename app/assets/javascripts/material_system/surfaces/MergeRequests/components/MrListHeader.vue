<template>
  <div class="mr-list-header">
    <h1 class="mr-list-header__title">Merge requests</h1>
    <span class="mr-list-header__count">{{ countLabel }}</span>
    <button type="button" class="mr-list-header__new-btn" @click="$emit('create')">
      <span class="material-symbols-outlined" aria-hidden="true">add</span>
      New merge request
    </button>
  </div>
</template>

<script>
export default {
  name: 'MrListHeader',
  props: {
    count: { type: Number, required: true },
  },
  computed: {
    countLabel() {
      return `${this.count} merge request${this.count === 1 ? '' : 's'}`;
    },
  },
};
</script>
