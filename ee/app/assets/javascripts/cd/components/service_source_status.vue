<script>
import { GlIcon, GlSprintf } from '@gitlab/ui';
import TimeAgo from '~/vue_shared/components/time_ago_tooltip.vue';
import { s__ } from '~/locale';
import { SYNC_STATUS } from '../constants';

export default {
  name: 'ServiceSourceStatus',
  components: {
    GlIcon,
    GlSprintf,
    TimeAgo,
  },
  props: {
    sourceRef: {
      type: String,
      required: false,
      default: '',
    },
    lastDeployed: {
      type: String,
      required: false,
      default: null,
    },
    deployedBy: {
      type: String,
      required: false,
      default: null,
    },
    sync: {
      type: String,
      required: false,
      default: null,
    },
  },
  computed: {
    syncStatus() {
      return SYNC_STATUS[this.sync];
    },
    hasSyncStatus() {
      // Unknown/absent sync has no SYNC_STATUS entry; render nothing rather
      // than a broken row.
      return Boolean(this.syncStatus);
    },
    lastDeployedMessage() {
      return this.deployedBy
        ? s__('ContinuousDeployment|%{timeAgo} by %{user}')
        : s__('ContinuousDeployment|%{timeAgo}');
    },
  },
};
</script>

<template>
  <div class="gl-flex gl-flex-col gl-gap-5 gl-text-sm" data-testid="service-source-status">
    <div v-if="sourceRef">
      <p class="gl-mb-1 gl-text-xs gl-font-bold gl-uppercase gl-text-secondary">
        {{ s__('ContinuousDeployment|Source') }}
      </p>
      <span class="gl-font-monospace" data-testid="source-ref">{{ sourceRef }}</span>
    </div>

    <div v-if="lastDeployed">
      <p class="gl-mb-1 gl-text-xs gl-font-bold gl-uppercase gl-text-secondary">
        {{ s__('ContinuousDeployment|Last deployed') }}
      </p>
      <span data-testid="last-deployed">
        <gl-sprintf :message="lastDeployedMessage">
          <template #timeAgo>
            <time-ago :time="lastDeployed" />
          </template>
          <template v-if="deployedBy" #user>{{ deployedBy }}</template>
        </gl-sprintf>
      </span>
    </div>

    <div v-if="hasSyncStatus">
      <p class="gl-mb-1 gl-text-xs gl-font-bold gl-uppercase gl-text-secondary">
        {{ s__('ContinuousDeployment|Sync status') }}
      </p>
      <span class="gl-flex gl-items-center gl-gap-2" data-testid="sync-status">
        <gl-icon :name="syncStatus.icon" :variant="syncStatus.variant" />
        {{ syncStatus.label }}
      </span>
    </div>
  </div>
</template>
