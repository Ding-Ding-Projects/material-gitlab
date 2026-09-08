<template>
  <div class="mgl-pl-job-card" :class="{ 'is-active': active }">
    <span class="mgl-icon" :class="{ 'mgl-icon--spin': job.status === 'running' }" :style="{ color: meta.fg }" aria-hidden="true">{{ meta.icon }}</span>
    <material-button variant="text" type="button" class="mgl-pl-job-name" :aria-pressed="active" @click="$emit('pick')">{{ job.name }}</material-button>
    <span class="mgl-pl-job-duration">{{ job.duration }}</span>
  </div>
</template>

<script>
import MaterialButton from '../../../components/material_button';
import { statusMeta } from '../data';

export default {
  components: { MaterialButton },
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
