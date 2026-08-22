<script>
import { __, sprintf } from '~/locale';
import MdsIcon from './MdsIcon.vue';
import { EPIC_STATE, progressPercent, progressTotal, formatMonthRange } from '../data';

export default {
  name: 'EpicTreeRow',
  components: { MdsIcon },
  props: {
    epicItem: { type: Object, required: true },
    selected: { type: Boolean, default: false },
    collapsed: { type: Boolean, default: false },
    tabindex: { type: Number, default: -1 },
  },
  computed: {
    isOpen() {
      return this.epicItem.state === EPIC_STATE.OPEN;
    },
    stateIcon() {
      return this.isOpen ? 'flag' : 'check-circle';
    },
    stateLabel() {
      return this.isOpen ? __('Open') : __('Closed');
    },
    percent() {
      return progressPercent(this.epicItem.descendantCounts);
    },
    countsLabel() {
      const { closedIssues } = this.epicItem.descendantCounts;
      return `${closedIssues}/${progressTotal(this.epicItem.descendantCounts)}`;
    },
    dateRange() {
      return formatMonthRange(this.epicItem.startDate, this.epicItem.dueDate);
    },
    indentStyle() {
      return { paddingLeft: `${20 + this.epicItem.depth * 34}px` };
    },
    expandLabel() {
      return this.collapsed
        ? sprintf(__('Expand %{title}'), { title: this.epicItem.title })
        : sprintf(__('Collapse %{title}'), { title: this.epicItem.title });
    },
    selectLabel() {
      return sprintf(__('Select %{title}'), { title: this.epicItem.title });
    },
  },
  methods: {
    focusRow() {
      this.$refs.row.focus();
    },
  },
};
</script>

<template>
  <div
    ref="row"
    class="gl-mds-epics__row"
    role="treeitem"
    :aria-expanded="epicItem.hasChildren ? String(!collapsed) : null"
    :aria-level="epicItem.depth + 1"
    :aria-selected="selected"
    :tabindex="tabindex"
    :style="indentStyle"
    @keydown="$emit('row-keydown', $event)"
  >
    <input
      type="checkbox"
      class="gl-mds-epics__checkbox"
      :checked="selected"
      :aria-label="selectLabel"
      @click.stop
      @change="$emit('toggle-select', epicItem.id)"
    />
    <button
      v-if="epicItem.hasChildren"
      type="button"
      class="gl-mds-epics__chevron"
      :aria-label="expandLabel"
      @click.stop="$emit('toggle-collapse', epicItem.id)"
    >
      <mds-icon :name="collapsed ? 'chevron-right' : 'expand-more'" size="sm" />
    </button>
    <span v-else class="gl-mds-epics__chevron gl-mds-epics__chevron--placeholder" aria-hidden="true"></span>
    <span class="gl-mds-epics__row-icon" :class="isOpen ? 'gl-mds-epics__row-icon--open' : ''">
      <mds-icon :name="stateIcon" size="md" />
    </span>
    <div class="gl-mds-epics__row-body">
      <div class="gl-mds-epics__row-title">{{ epicItem.title }}</div>
      <div class="gl-mds-epics__row-meta">{{ epicItem.reference }} · {{ dateRange }}</div>
    </div>
    <div class="gl-mds-epics__row-progress">
      <div class="gl-mds-epics__progress-track">
        <div class="gl-mds-epics__progress-fill" :style="{ width: `${percent}%` }"></div>
      </div>
      <span class="gl-mds-epics__row-progress-label">{{ percent }}% · {{ countsLabel }}</span>
    </div>
    <span
      class="gl-mds-epics__chip"
      :class="isOpen ? 'gl-mds-epics__chip--open' : 'gl-mds-epics__chip--closed'"
      >{{ stateLabel }}</span
    >
  </div>
</template>

<style scoped>
.gl-mds-epics__row-icon--open {
  color: var(--gl-mds-prim);
}

.gl-mds-epics__row-icon:not(.gl-mds-epics__row-icon--open) {
  color: var(--gl-mds-onsurfv);
}
</style>
