<template>
  <div class="mgl-pl-log" data-screen-label="Job log">
    <div class="mgl-pl-log-header">
      <span class="mgl-icon" :class="{ 'mgl-icon--spin': job.status === 'running' }" :style="{ color: meta.fg }" aria-hidden="true">{{ meta.icon }}</span>
      <span class="mgl-pl-log-name">{{ job.name }}</span>
      <span class="mgl-pl-log-duration">{{ job.duration }}</span>
      <button type="button" class="mgl-pl-log-retry" @click="$emit('retry-job')">
        <span class="mgl-icon mgl-icon--sm" aria-hidden="true">replay</span>Retry job
      </button>
    </div>
    <div class="mgl-pl-log-lines" role="log" aria-live="polite" aria-label="Job log output">
      <div v-for="(line, index) in logLines" :key="index" :style="{ color: line.color }">{{ line.text }}</div>
    </div>
  </div>
</template>

<script>
import { statusMeta } from '../data';

export default {
  name: 'PipelinesJobLogViewer',
  props: {
    job: { type: Object, required: true },
    logLines: { type: Array, required: true },
  },
  computed: {
    meta() {
      return statusMeta(this.job.status);
    },
  },
};
</script>
