<template>
  <div>
    <div class="mr-detail__header">
      <button type="button" class="mr-icon-btn" aria-label="Back to merge requests list" @click="$emit('back')">
        <span class="material-symbols-outlined" aria-hidden="true">arrow_back</span>
      </button>
      <h1 class="mr-detail__title">{{ mr.title }}</h1>
      <span class="mr-detail__state-badge" :data-state="mr.state">{{ mr.state }}</span>
    </div>
    <div class="mr-detail__meta-line">
      !{{ mr.iid }} ·
      <span class="mr-detail__ref">{{ mr.branch }}</span>
      →
      <span class="mr-detail__ref">{{ mr.target }}</span>
      · {{ mr.author }} · {{ mr.when }}
    </div>
  </div>
</template>

<script>
export default {
  name: 'MrDetailHeader',
  props: {
    mr: { type: Object, required: true },
  },
};
</script>
