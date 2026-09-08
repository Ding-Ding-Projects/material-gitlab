<script>
import MaterialButton from '~/material_system/components/material_button';

import { __, n__ } from '~/locale';
import MdsIcon from './MdsIcon.vue';

export default {
  methods: {
    __,
    n__,
  },
  name: 'BulkActionBar',
  components: { MaterialButton, MdsIcon },
  props: {
    count: { type: Number, required: true },
    canUpdate: { type: Boolean, default: false },
    canDelete: { type: Boolean, default: false },
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
    <material-button variant="text" v-if="canUpdate" type="button" class="gl-mds-epics__bulkbar-btn" @click="$emit('reopen')">
      <mds-icon name="refresh" size="sm" />{{ __('Reopen') }}
    </material-button>
    <material-button variant="text" v-if="canUpdate" type="button" class="gl-mds-epics__bulkbar-btn" @click="$emit('close')">
      <mds-icon name="check-circle" size="sm" />{{ __('Close') }}
    </material-button>
    <material-button variant="text" type="button" class="gl-mds-epics__bulkbar-btn" @click="$emit('export', 'csv')">
      <mds-icon name="download" size="sm" />{{ __('Export CSV') }}
    </material-button>
    <material-button variant="text" type="button" class="gl-mds-epics__bulkbar-btn" @click="$emit('export', 'json')">
      <mds-icon name="copy" size="sm" />{{ __('Export JSON') }}
    </material-button>
    <material-button variant="text"
      v-if="canDelete"
      type="button"
      class="gl-mds-epics__bulkbar-btn gl-mds-epics__bulkbar-btn--danger"
      @click="$emit('delete')"
    >
      <mds-icon name="delete" size="sm" />{{ __('Delete') }}
    </material-button>
    <material-button variant="text"
      type="button"
      class="gl-mds-epics__bulkbar-btn"
      :aria-label="__('Clear selection')"
      @click="$emit('clear')"
    >
      <mds-icon name="close" size="sm" />{{ __('Clear') }}
    </material-button>
  </div>
</template>
