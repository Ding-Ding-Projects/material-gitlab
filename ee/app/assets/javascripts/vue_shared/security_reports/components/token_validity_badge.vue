<script>
import { GlLabel } from '@gitlab/ui';
import { s__ } from '~/locale';
import HelpPopover from '~/vue_shared/components/help_popover.vue';
import { VALIDITY_CHECK_POPOVER_OPTIONS } from './constants';

const VALIDITY_CHECK_TYPE = {
  active: { color: '#c91c00', title: s__('Vulnerability|Active secret') },
  inactive: { color: '#428fdc', title: s__('Vulnerability|Inactive secret') },
  unknown: { color: '#ececef', title: s__('Vulnerability|Possibly active secret') },
};

export default {
  name: 'TokenValidityBadge',
  components: {
    GlLabel,
    HelpPopover,
  },
  props: {
    status: {
      type: String,
      required: false,
      default: 'unknown',
    },
    /** Turn off where the surrounding layout explains the validity check itself. */
    showHelpPopover: {
      type: Boolean,
      required: false,
      default: true,
    },
  },
  validityCheckPopoverOptions: VALIDITY_CHECK_POPOVER_OPTIONS,
  computed: {
    validityCheckLabel() {
      switch (this.status?.toLowerCase()) {
        case 'active':
          return VALIDITY_CHECK_TYPE.active;
        case 'inactive':
          return VALIDITY_CHECK_TYPE.inactive;
        default:
          return VALIDITY_CHECK_TYPE.unknown;
      }
    },
  },
};
</script>

<template>
  <div class="gl-inline-block">
    <gl-label
      :background-color="validityCheckLabel.color"
      :title="validityCheckLabel.title"
      data-testid="validityCheckLabel"
    />
    <help-popover
      v-if="showHelpPopover"
      class="gl-ml-2"
      :options="$options.validityCheckPopoverOptions"
    />
  </div>
</template>
