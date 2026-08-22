<script>
import { __, n__ } from '~/locale';
import MdsIcon from './MdsIcon.vue';

export default {
  name: 'BulkActionBar',
  components: { MdsIcon },
  props: {
    count: { type: Number, required: true },
  },
  computed: {
    countLabel() {
      return n__('%d epic selected', '%d epics selected', this.count);
    },
  },
};
</script>

<template>
  <div v-if="count > 0" class="gl-mds-epics__bulkbar" role="toolbar" :aria-label="__('Bulk actions')">
    <span class="gl-mds-epics__bulkbar-count">{{ countLabel }}</span>
    <button type="button" class="gl-mds-epics__bulkbar-btn" @click="$emit('reopen')">
      <mds-icon name="refresh" size="sm" />{{ __('Reopen') }}
    </button>
    <button type="button" class="gl-mds-epics__bulkbar-btn" @click="$emit('close')">
      <mds-icon name="check-circle" size="sm" />{{ __('Close') }}
    </button>
    <button type="button" class="gl-mds-epics__bulkbar-btn" @click="$emit('export', 'csv')">
      <mds-icon name="download" size="sm" />{{ __('Export CSV') }}
    </button>
    <button type="button" class="gl-mds-epics__bulkbar-btn" @click="$emit('export', 'json')">
      <mds-icon name="copy" size="sm" />{{ __('Export JSON') }}
    </button>
    <button
      type="button"
      class="gl-mds-epics__bulkbar-btn gl-mds-epics__bulkbar-btn--danger"
      @click="$emit('delete')"
    >
      <mds-icon name="delete" size="sm" />{{ __('Delete') }}
    </button>
    <button
      type="button"
      class="gl-mds-epics__bulkbar-btn"
      :aria-label="__('Clear selection')"
      @click="$emit('clear')"
    >
      <mds-icon name="close" size="sm" />{{ __('Clear') }}
    </button>
  </div>
</template>
