<template>
  <main ref="root" class="mr-detail-main" tabindex="-1" data-screen-label="MR detail" aria-label="Merge request detail">
    <mr-detail-header :mr="mr" @back="$emit('back')" />
    <mr-detail-tabs :active-tab="tab" @change="tab = $event" />
    <div class="mr-detail__panel">
      <mr-overview-tab
        v-if="tab === 'overview'"
        :mr="mr"
        :merging="merging"
        :merging-phrase="mergingPhrase"
        @merge="startMerge"
        @toggle-approve="$emit('toggle-approve', mr.id)"
      />
      <mr-changes-tab
        v-else-if="tab === 'changes'"
        :mr="mr"
        :active-file-index="activeFileIndex"
        @select-file="activeFileIndex = $event"
      />
      <mr-discussion-tab
        v-else
        :mr="mr"
        :comment="comment"
        @update:comment="comment = $event"
        @add-comment="submitComment"
        @toggle-resolve="onToggleResolve"
      />
    </div>
  </main>
</template>

<script>
import MrDetailHeader from './MrDetailHeader.vue';
import MrDetailTabs from './MrDetailTabs.vue';
import MrOverviewTab from './MrOverviewTab.vue';
import MrChangesTab from './MrChangesTab.vue';
import MrDiscussionTab from './MrDiscussionTab.vue';
import { MERGE_PHRASES } from '../data';

const MERGE_DURATION_MS = 1600;
const PHRASE_INTERVAL_MS = 1000;

export default {
  name: 'MrDetail',
  components: { MrDetailHeader, MrDetailTabs, MrOverviewTab, MrChangesTab, MrDiscussionTab },
  props: {
    mr: { type: Object, required: true },
  },
  data() {
    return {
      tab: 'overview',
      activeFileIndex: 0,
      comment: '',
      merging: false,
      mergingPhraseIndex: 0,
      mergingTimer: null,
      mergingTimeout: null,
    };
  },
  computed: {
    mergingPhrase() {
      return this.merging ? MERGE_PHRASES[this.mergingPhraseIndex % MERGE_PHRASES.length] : null;
    },
  },
  mounted() {
    this.$refs.root && this.$refs.root.focus();
  },
  beforeDestroy() {
    this.clearMergeTimers();
  },
  methods: {
    startMerge() {
      if (this.merging || this.mr.state !== 'Open' || !this.mr.canMerge) return;
      this.merging = true;
      this.mergingPhraseIndex = 0;
      this.mergingTimer = setInterval(() => {
        this.mergingPhraseIndex += 1;
      }, PHRASE_INTERVAL_MS);
      this.mergingTimeout = setTimeout(() => {
        this.clearMergeTimers();
        this.merging = false;
        this.$emit('merge-complete', this.mr.id);
      }, MERGE_DURATION_MS);
    },
    clearMergeTimers() {
      if (this.mergingTimer) clearInterval(this.mergingTimer);
      if (this.mergingTimeout) clearTimeout(this.mergingTimeout);
      this.mergingTimer = null;
      this.mergingTimeout = null;
    },
    submitComment() {
      this.$emit('add-comment', { mrId: this.mr.id, text: this.comment });
      this.comment = '';
    },
    onToggleResolve(threadIndex) {
      this.$emit('toggle-resolve', { mrId: this.mr.id, threadIndex });
    },
  },
};
</script>
