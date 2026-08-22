<template>
  <div class="mgl-pl-stagedots">
    <span
      v-for="dot in dots"
      :key="dot.name"
      :title="dot.name"
      class="mgl-icon"
      :class="{ 'mgl-icon--spin': dot.status === 'running' }"
      :style="{ color: dot.fg }"
      role="img"
      :aria-label="`${dot.name}: ${dot.status}`"
      >{{ dot.icon }}</span
    >
  </div>
</template>

<script>
import { statusMeta, worstJobStatus } from '../data';

export default {
  name: 'PipelinesStageDots',
  props: {
    stages: { type: Array, required: true },
  },
  computed: {
    dots() {
      return this.stages.map((stage) => {
        const worst = worstJobStatus(stage.jobs);
        const meta = statusMeta(worst);
        return { name: stage.name, status: worst, icon: meta.icon, fg: meta.fg };
      });
    },
  },
};
</script>
