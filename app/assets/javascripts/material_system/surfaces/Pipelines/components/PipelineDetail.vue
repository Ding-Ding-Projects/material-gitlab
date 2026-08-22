<template>
  <main class="mgl-pl-detail" data-screen-label="Pipeline detail" aria-label="Pipeline detail">
    <detail-header :pipeline="pipeline" @back="$emit('back')" @retry="$emit('retry')" @cancel="$emit('cancel')" />
    <stage-dag :stages="pipeline.stages" :active-job-key="activeJobKey" @pick-job="$emit('pick-job', $event)" />
    <job-log-viewer v-if="activeJob" :job="activeJob" :log-lines="activeJobLog" @retry-job="$emit('retry-job')" />
  </main>
</template>

<script>
import DetailHeader from './DetailHeader.vue';
import StageDag from './StageDag.vue';
import JobLogViewer from './JobLogViewer.vue';

export default {
  name: 'PipelinesDetail',
  components: { DetailHeader, StageDag, JobLogViewer },
  props: {
    pipeline: { type: Object, required: true },
    activeJobKey: { type: String, default: null },
    activeJob: { type: Object, default: null },
    activeJobLog: { type: Array, default: () => [] },
  },
};
</script>
