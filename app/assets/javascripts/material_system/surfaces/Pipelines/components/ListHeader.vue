<template>
  <div class="mgl-pl-list-header">
    <h1>Pipelines</h1>
    <span class="mgl-pl-count">{{ countLabel }}</span>
    <button type="button" class="mgl-pl-run-btn" @click="$emit('run')">
      <span class="mgl-icon" aria-hidden="true">play_arrow</span>Run pipeline
    </button>
  </div>
</template>

<script>
export default {
  name: 'PipelinesListHeader',
  props: {
    countLabel: { type: String, required: true },
  },
};
</script>
