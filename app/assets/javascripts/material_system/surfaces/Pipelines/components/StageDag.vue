<template>
  <div class="mgl-pl-dag" data-screen-label="Stage DAG" role="group" aria-label="Pipeline stages and jobs">
    <div v-for="stage in stages" :key="stage.name" class="mgl-pl-stage-col">
      <div class="mgl-pl-stage-name">{{ stage.name }}</div>
      <job-card
        v-for="job in stage.jobs"
        :key="job.key"
        :job="job"
        :active="activeJobKey === `${stage.name}:${job.key}`"
        @pick="$emit('pick-job', `${stage.name}:${job.key}`)"
      />
    </div>
  </div>
</template>

<script>
import JobCard from './JobCard.vue';

export default {
  name: 'PipelinesStageDag',
  components: { JobCard },
  props: {
    stages: { type: Array, required: true },
    activeJobKey: { type: String, default: null },
  },
};
</script>
