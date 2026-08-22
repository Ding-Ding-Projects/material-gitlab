<script>
import { __, sprintf } from '~/locale';
import { EPIC_STATE, progressPercent, progressTotal, formatMonthRange, roadmapBarGeometry } from '../data';

export default {
  name: 'RoadmapRow',
  props: {
    epicItem: { type: Object, required: true },
  },
  computed: {
    isOpen() {
      return this.epicItem.state === EPIC_STATE.OPEN;
    },
    percent() {
      return progressPercent(this.epicItem.descendantCounts);
    },
    geometry() {
      return roadmapBarGeometry(this.epicItem.startDate, this.epicItem.dueDate);
    },
    barStyle() {
      return { left: `${this.geometry.leftPercent}%`, width: `${this.geometry.widthPercent}%` };
    },
    variantClass() {
      if (!this.isOpen) return 'gl-mds-epics__roadmap-bar--closed';
      return this.percent > 50 ? 'gl-mds-epics__roadmap-bar--high' : 'gl-mds-epics__roadmap-bar--low';
    },
    dateRange() {
      return formatMonthRange(this.epicItem.startDate, this.epicItem.dueDate);
    },
    tooltip() {
      const counts = `${this.epicItem.descendantCounts.closedIssues}/${progressTotal(this.epicItem.descendantCounts)}`;
      return sprintf(__('%{title}: %{dates} · %{percent}%% complete · %{counts} issues closed'), {
        title: this.epicItem.title,
        dates: this.dateRange,
        percent: this.percent,
        counts,
      });
    },
  },
};
</script>

<template>
  <div class="gl-mds-epics__roadmap-row" role="row">
    <span class="gl-mds-epics__roadmap-title" role="rowheader">{{ epicItem.title }}</span>
    <div class="gl-mds-epics__roadmap-track" role="cell">
      <div
        class="gl-mds-epics__roadmap-bar"
        :class="variantClass"
        :style="barStyle"
        :title="tooltip"
        :aria-label="tooltip"
      >
        <span class="gl-mds-epics__roadmap-bar-label">{{ percent }}%</span>
      </div>
    </div>
  </div>
</template>
