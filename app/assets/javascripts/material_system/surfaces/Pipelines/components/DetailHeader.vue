<template>
  <div class="mgl-pl-detail-header">
    <button type="button" class="mgl-pl-icon-btn mgl-pl-icon-btn--lg" title="Back to pipelines" aria-label="Back to pipelines list" @click="$emit('back')">
      <span class="mgl-icon" aria-hidden="true">arrow_back</span>
    </button>
    <h1>Pipeline #{{ pipeline.id }} · {{ pipeline.title }}</h1>
    <button type="button" class="mgl-pl-detail-btn" @click="$emit('retry')">
      <span class="mgl-icon mgl-icon--sm" aria-hidden="true">replay</span>Retry
    </button>
    <button type="button" class="mgl-pl-detail-btn mgl-pl-detail-btn--danger" @click="$emit('cancel')">
      <span class="mgl-icon mgl-icon--sm" aria-hidden="true">cancel</span>Cancel
    </button>
  </div>
</template>

<script>
export default {
  name: 'PipelinesDetailHeader',
  props: {
    pipeline: { type: Object, required: true },
  },
};
</script>
