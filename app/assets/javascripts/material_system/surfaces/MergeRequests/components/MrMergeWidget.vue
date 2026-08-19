<template>
  <div class="mr-card mr-merge-widget" data-screen-label="Merge widget">
    <div v-for="check in checks" :key="check.label" class="mr-merge-widget__check">
      <span
        class="material-symbols-outlined mr-merge-widget__check-icon"
        :style="{ color: `var(${check.colorVar})` }"
        aria-hidden="true"
      >
        {{ check.icon }}
      </span>
      {{ check.label }}
      <span class="mr-merge-widget__check-note">{{ check.note }}</span>
    </div>
    <div class="mr-merge-widget__actions">
      <button
        type="button"
        class="mr-merge-widget__merge-btn"
        :disabled="mergeDisabled"
        @click="$emit('merge')"
      >
        <span class="material-symbols-outlined" aria-hidden="true">call_merge</span>
        {{ mergeLabel }}
      </button>
      <span v-if="mergingPhrase" class="mr-merge-widget__phrase" role="status">{{ mergingPhrase }}</span>
      <button
        type="button"
        class="mr-merge-widget__approve-btn"
        :aria-pressed="mr.approvedByMe ? 'true' : 'false'"
        @click="$emit('toggle-approve')"
      >
        <span class="material-symbols-outlined" style="font-size: 18px" aria-hidden="true">verified</span>
        {{ mr.approvedByMe ? 'Approved' : 'Approve' }}
      </button>
    </div>
  </div>
</template>

<script>
import { PIPELINE_STATUS_META, unresolvedThreadCount } from '../data';

export default {
  name: 'MrMergeWidget',
  props: {
    mr: { type: Object, required: true },
    merging: { type: Boolean, default: false },
    mergingPhrase: { type: String, default: null },
  },
  computed: {
    checks() {
      const pipeline = PIPELINE_STATUS_META[this.mr.pipeline];
      const [approved, required] = this.mr.approvals.split('/');
      const unresolved = unresolvedThreadCount(this.mr);
      return [
        { label: 'Pipeline', icon: pipeline.icon, colorVar: pipeline.colorVar, note: this.mr.pipeline },
        {
          label: 'Approvals',
          icon: approved === required ? 'check_circle' : 'pending',
          colorVar: approved === required ? '--mr-good' : '--mr-warn',
          note: `${this.mr.approvals} required approvals`,
        },
        {
          label: 'Unresolved threads',
          icon: unresolved ? 'pending' : 'check_circle',
          colorVar: unresolved ? '--mr-warn' : '--mr-good',
          note: `${unresolved} open`,
        },
      ];
    },
    mergeLabel() {
      if (this.mr.state === 'Merged') return 'Merged';
      if (this.merging) return 'Merging…';
      return this.mr.canMerge ? 'Merge' : 'Merge blocked';
    },
    mergeDisabled() {
      return this.mr.state !== 'Open' || !this.mr.canMerge || this.merging;
    },
  },
};
</script>
