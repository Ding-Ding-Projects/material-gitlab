<script>
import SeverityBadge from './SeverityBadge.vue';
import StatusChip from './StatusChip.vue';
import MaterialIcon from './icons/MaterialIcon.vue';
import { STATUSES, statusColorVars } from '../data';
import trapFocus from '../focus_trap';

/** The anchored triage drawer, ported from the design's `sc-if value="{{ drawer }}"` block. */
export default {
  name: 'TriageDrawer',
  components: { SeverityBadge, StatusChip, MaterialIcon },
  props: {
    vulnerability: {
      type: Object,
      required: true,
    },
    issueCreated: {
      type: Boolean,
      required: false,
      default: false,
    },
  },
  computed: {
    statusOptions() {
      return STATUSES.map((status) => ({ status, ...statusColorVars(status) }));
    },
    createIssueLabel() {
      return this.issueCreated ? 'Issue #4335 created ✓' : 'Create issue';
    },
  },
  mounted() {
    this.releaseTrap = trapFocus(this.$refs.panel, { initialFocus: '.sec-drawer__close' });
    document.addEventListener('keydown', this.onKeydown);
  },
  beforeDestroy() {
    document.removeEventListener('keydown', this.onKeydown);
    if (this.releaseTrap) this.releaseTrap();
  },
  methods: {
    onKeydown(event) {
      if (event.key === 'Escape') this.$emit('close');
    },
    onScrimClick() {
      this.$emit('close');
    },
  },
};
</script>

<template>
  <div>
    <div class="sec-scrim" @click="onScrimClick"></div>
    <aside
      ref="panel"
      class="sec-drawer"
      role="dialog"
      aria-modal="true"
      :aria-label="`Triage: ${vulnerability.title}`"
    >
      <div class="sec-drawer__header">
        <severity-badge :severity="vulnerability.severity" />
        <span class="sec-drawer__cve">{{ vulnerability.cve }}</span>
        <button type="button" class="sec-icon-button sec-drawer__close" aria-label="Close triage drawer" @click="$emit('close')">
          <material-icon name="close" />
        </button>
      </div>
      <h2 class="sec-drawer__title">{{ vulnerability.title }}</h2>
      <p class="sec-drawer__description">{{ vulnerability.description }}</p>
      <div class="sec-drawer__meta">
        <div><strong>Scanner</strong> · {{ vulnerability.scanner }}</div>
        <div><strong>Location</strong> · <span class="sec-row__location">{{ vulnerability.location }}</span></div>
        <div><strong>Identified</strong> · {{ vulnerability.detectedAt }}</div>
      </div>
      <div class="sec-drawer__status">
        <div class="sec-drawer__status-label">Set status</div>
        <div class="sec-drawer__status-chips">
          <status-chip
            v-for="option in statusOptions"
            :key="option.status"
            :label="option.status"
            :bg="option.bg"
            :fg="option.fg"
            :active="vulnerability.status === option.status"
            @pick="$emit('set-status', option.status)"
          />
        </div>
      </div>
      <button type="button" class="sec-button sec-drawer__create-issue" @click="$emit('create-issue')">
        <material-icon name="addTask" />
        {{ createIssueLabel }}
      </button>
    </aside>
  </div>
</template>
