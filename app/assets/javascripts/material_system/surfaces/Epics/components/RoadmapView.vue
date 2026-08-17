<script>
import { __ } from '~/locale';
import RoadmapRow from './RoadmapRow.vue';
import EmptyState from './EmptyState.vue';
import { ROADMAP_MONTHS, ROADMAP_YEAR } from '../data';

export default {
  name: 'RoadmapView',
  components: { RoadmapRow, EmptyState },
  props: {
    rows: { type: Array, required: true },
    hasQuery: { type: Boolean, default: false },
  },
  computed: {
    months() {
      return ROADMAP_MONTHS;
    },
    windowLabel() {
      return `${ROADMAP_MONTHS[0]}–${ROADMAP_MONTHS[ROADMAP_MONTHS.length - 1]} ${ROADMAP_YEAR}`;
    },
    emptyTitle() {
      return this.hasQuery ? __('No epics match your search') : __('Nothing to plot yet');
    },
    emptyText() {
      return this.hasQuery
        ? __('Try a different search term, or clear the search to see the full roadmap.')
        : __('Epics with start and due dates will appear on this timeline.');
    },
  },
};
</script>

<template>
  <div class="gl-mds-epics__roadmap-card" role="table" :aria-label="`${__('Roadmap')}, ${windowLabel}`">
    <div class="gl-mds-epics__roadmap-months" role="row">
      <span role="columnheader" aria-hidden="true"></span>
      <span
        v-for="month in months"
        :key="month"
        role="columnheader"
        class="gl-mds-epics__roadmap-month"
        >{{ month }}</span
      >
    </div>
    <template v-if="rows.length">
      <roadmap-row v-for="row in rows" :key="row.id" :epic-item="row" />
    </template>
    <empty-state v-else :icon="hasQuery ? 'search' : 'timeline'" :title="emptyTitle" :text="emptyText" />
  </div>
</template>
