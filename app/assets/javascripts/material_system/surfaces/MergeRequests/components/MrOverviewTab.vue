<template>
  <div
    id="mr-tabpanel-overview"
    class="mr-overview"
    role="tabpanel"
    aria-labelledby="mr-tab-overview"
    tabindex="0"
  >
    <p class="mr-card mr-overview__description">{{ mr.body }}</p>
    <mr-merge-widget
      :mr="mr"
      :merging="merging"
      :merging-phrase="mergingPhrase"
      @merge="$emit('merge')"
      @toggle-approve="$emit('toggle-approve')"
    />
  </div>
</template>

<script>
import MrMergeWidget from './MrMergeWidget.vue';

export default {
  name: 'MrOverviewTab',
  components: { MrMergeWidget },
  props: {
    mr: { type: Object, required: true },
    merging: { type: Boolean, default: false },
    mergingPhrase: { type: String, default: null },
  },
};
</script>
