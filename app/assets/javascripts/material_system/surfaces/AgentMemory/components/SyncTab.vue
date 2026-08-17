<template>
  <div id="am-tabpanel-sync" class="am-tabpanel" role="tabpanel" aria-labelledby="am-tab-sync" tabindex="0">
    <div class="am-card am-sync-card">
      <div class="am-sync-card__head">
        <MaterialIcon :name="icon" :size="26" class="am-sync-card__icon" :class="`am-sync-card__icon--${tone}`" />
        <div>
          <div class="am-sync-card__title">{{ title }}</div>
          <div class="am-sync-card__subtitle">{{ subtitle }}</div>
        </div>
        <button type="button" class="am-btn am-btn--filled" :disabled="running" @click="$emit('run-sync')">
          <MaterialIcon name="sync" :size="18" :class="{ 'am-sync-step__icon--spin': running }" />
          {{ buttonLabel }}
        </button>
      </div>
      <SyncStepRow v-for="step in steps" :key="step.key" :step="step" />
      <div class="am-sync-card__footnote">
        Timestamped backup created before every replacement · noncanonical checkouts fail closed without the
        authorization word.
      </div>
    </div>
  </div>
</template>

<script>
import MaterialIcon from './MaterialIcon.vue';
import SyncStepRow from './SyncStepRow.vue';

export default {
  name: 'SyncTab',
  components: { MaterialIcon, SyncStepRow },
  props: {
    phase: {
      type: String,
      required: true,
    },
    steps: {
      type: Array,
      required: true,
    },
  },
  computed: {
    running() {
      return this.phase !== 'idle' && this.phase !== 'done';
    },
    icon() {
      if (this.phase === 'done') return 'check-circle';
      if (this.phase === 'idle') return 'cloud-sync';
      return 'sync';
    },
    tone() {
      return this.phase === 'done' ? 'good' : 'active';
    },
    title() {
      if (this.phase === 'done') return 'Synchronized';
      if (this.phase === 'idle') return 'Canonical sync';
      return 'Synchronizing…';
    },
    subtitle() {
      return this.phase === 'done'
        ? 'All targets updated · backup retained'
        : 'Managed block + owned skills only · scoped authorization';
    },
    buttonLabel() {
      return this.running ? 'Running…' : 'Sync now';
    },
  },
};
</script>
