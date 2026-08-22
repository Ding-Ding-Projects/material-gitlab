<template>
  <div
    id="mr-tabpanel-changes"
    class="mr-changes"
    role="tabpanel"
    aria-labelledby="mr-tab-changes"
    tabindex="0"
  >
    <template v-if="mr.files.length">
      <mr-diff-file-tree :files="mr.files" :active-index="clampedIndex" @select="$emit('select-file', $event)" />
      <mr-diff-pane :file="mr.files[clampedIndex]" />
    </template>
    <div v-else class="mr-list__empty">This merge request has no file changes to display.</div>
  </div>
</template>

<script>
import MrDiffFileTree from './MrDiffFileTree.vue';
import MrDiffPane from './MrDiffPane.vue';

export default {
  name: 'MrChangesTab',
  components: { MrDiffFileTree, MrDiffPane },
  props: {
    mr: { type: Object, required: true },
    activeFileIndex: { type: Number, required: true },
  },
  computed: {
    clampedIndex() {
      return Math.min(this.activeFileIndex, Math.max(this.mr.files.length - 1, 0));
    },
  },
};
</script>
