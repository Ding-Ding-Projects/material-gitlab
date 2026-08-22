<template>
  <button
    type="button"
    class="mgl-pl-job-card"
    :class="{ 'is-active': active }"
    :aria-pressed="active"
    @click="$emit('pick')"
  >
    <span class="mgl-icon" :class="{ 'mgl-icon--spin': job.status === 'running' }" :style="{ color: meta.fg }" aria-hidden="true">{{ meta.icon }}</span>
    <span class="mgl-pl-job-name">{{ job.name }}</span>
    <span class="mgl-pl-job-duration">{{ job.duration }}</span>
  </button>
</template>

<script>
import { statusMeta } from '../data';

export default {
  name: 'PipelinesJobCard',
  props: {
    job: { type: Object, required: true },
    active: { type: Boolean, default: false },
  },
  computed: {
    meta() {
      return statusMeta(this.job.status);
    },
  },
};
</script>
