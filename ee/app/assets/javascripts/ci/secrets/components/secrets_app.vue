<script>
import { computed } from 'vue';
import { GlAlert, GlLink, GlLoadingIcon, GlSprintf, GlToastMixin } from '@gitlab/ui';
import { helpPagePath } from '~/helpers/help_page_helper';
import { s__, sprintf } from '~/locale';
import { createAlert } from '~/alert';
import glFeatureFlagsMixin from '~/vue_shared/mixins/gl_feature_flags_mixin';
import { fetchPolicies } from '~/lib/graphql';
import { getDayDifference } from '~/lib/utils/datetime_utility';
import { formatGraphQLError } from 'ee/ci/secrets/utils';
import {
  ENTITLEMENT_STATE_BLOCKED,
  ENTITLEMENT_STATE_TRIAL,
  ENTITLEMENT_STATE_TRIAL_ELIGIBLE,
  INDEX_ROUTE_NAME,
  POLL_INTERVAL,
  SECRET_MANAGER_STATUS_ERROR,
  SECRET_MANAGER_STATUS_PROVISIONING,
  TRIAL_CREDITS_LOW_PERCENTAGE,
  TRIAL_EXPIRING_SOON_DAYS,
  TRIAL_ALERT_OPTIONS_BLOCKED,
  TRIAL_ALERT_OPTIONS_CREDITS_LOW,
  TRIAL_ALERT_OPTIONS_TRIAL_EXPIRING,
} from '../constants';
import getEntitlementQuery from '../graphql/queries/get_secrets_manager_entitlement.graphql';
import getOpenbaoHealthQuery from '../graphql/queries/get_openbao_health.query.graphql';

export default {
  name: 'SecretsApp',
  GITLAB_CREDITS_DOCS_LINK: helpPagePath('subscriptions/gitlab_credits'),
  components: {
    GlAlert,
    GlLink,
    GlLoadingIcon,
    GlSprintf,
  },
  mixins: [glFeatureFlagsMixin(), GlToastMixin],
  inject: ['contextConfig', 'fullPath', 'topLevelGroupFullPath'],
  provide() {
    return {
      entitlement: computed(() => this.entitlement),
      isOpenbaoHealthy: computed(() => this.isOpenbaoHealthy),
      isReadOnly: computed(() => this.isReadOnly),
    };
  },
  data() {
    return {
      entitlement: null,
      secretManagerStatus: undefined,
      isEntityBlocked: false,
      isOpenbaoHealthy: true,
    };
  },
  apollo: {
    entitlement: {
      query: getEntitlementQuery,
      fetchPolicy: fetchPolicies.NETWORK_ONLY,
      skip() {
        return !this.isPaidExperienceEnabled || !this.topLevelGroupFullPath;
      },
      variables() {
        return {
          fullPath: this.topLevelGroupFullPath,
        };
      },
      update(data) {
        return data.group?.secretsManagerEntitlement;
      },
      error(e) {
        createAlert({
          message: formatGraphQLError(e.message),
          captureError: true,
          error: e,
        });
      },
    },
    isOpenbaoHealthy: {
      query: getOpenbaoHealthQuery,
      update(data) {
        if (!data.openbaoHealth) {
          this.showOpenbaoUnhealthyAlert();
          this.redirectToIndex();
        }
        return data.openbaoHealth;
      },
      error() {
        this.isOpenbaoHealthy = false;
        this.showOpenbaoUnhealthyAlert();
        this.redirectToIndex();
      },
    },
    secretManagerStatus: {
      query() {
        return this.contextConfig.getStatus.query;
      },

      // need Boolean wrapper here because isPaidExperienceEnabled can be undefined
      // and Apollo treats non-boolean falsy values differently from false
      skip() {
        return Boolean(
          this.isPaidExperienceEnabled && (this.isEntitlementLoading || this.isTrialEligible),
        );
      },
      variables() {
        return {
          fullPath: this.fullPath,
        };
      },
      update(data) {
        // when not provisioned, secretsManagerStatus will return null
        if (data.secretsManager == null) {
          this.$apollo.queries.secretManagerStatus.stopPolling();
          return null;
        }

        const {
          status,
          entity: { archived, markedForDeletion },
        } = data.secretsManager;

        this.isEntityBlocked = archived || markedForDeletion;

        if (status !== SECRET_MANAGER_STATUS_PROVISIONING) {
          this.$apollo.queries.secretManagerStatus.stopPolling();
        }

        return status;
      },
      error(e) {
        this.$apollo.queries.secretManagerStatus.stopPolling();
        this.secretManagerStatus = SECRET_MANAGER_STATUS_ERROR;
        createAlert({
          message: formatGraphQLError(e.message),
          captureError: true,
          error: e,
        });
      },
      pollInterval: POLL_INTERVAL,
    },
  },
  computed: {
    creditsRemainingPercentage() {
      const { creditsRemaining, creditsTotal } = this.entitlement;
      if (creditsRemaining == null) {
        return 0;
      }

      return (creditsRemaining / creditsTotal) * 100;
    },
    creditsRemainingPercentageText() {
      const percentage = this.creditsRemainingPercentage;

      // this will only be shown in the UI; we don't show 0% since this is misleading
      // if credits are actually zero, the state will automatically be blocked
      // and blocked reason will be BLOCKED_REASON_CREDITS_EXHAUSTED
      return percentage < 1 ? 1 : Math.floor(percentage);
    },
    hasStatusError() {
      return this.secretManagerStatus && this.secretManagerStatus === SECRET_MANAGER_STATUS_ERROR;
    },
    isEntitlementLoading() {
      return this.$apollo.queries.entitlement.loading;
    },
    isReadOnly() {
      return this.isEntityBlocked || this.entitlement?.state === ENTITLEMENT_STATE_BLOCKED;
    },
    isPaidExperienceEnabled() {
      return this.glFeatures.secretsManagerPaidExperience;
    },
    isProvisioning() {
      return this.secretManagerStatus === SECRET_MANAGER_STATUS_PROVISIONING;
    },
    isSecretsManagerStatusLoading() {
      return this.$apollo.queries.secretManagerStatus.loading;
    },
    isTrialEligible() {
      return this.entitlement?.state === ENTITLEMENT_STATE_TRIAL_ELIGIBLE;
    },
    isTrialExpiringSoon() {
      return (
        this.entitlement.state === ENTITLEMENT_STATE_TRIAL &&
        this.trialDaysRemaining !== null &&
        this.trialDaysRemaining <= TRIAL_EXPIRING_SOON_DAYS
      );
    },
    showLoading() {
      if (this.isPaidExperienceEnabled) {
        return (
          this.isEntitlementLoading || (!this.isTrialEligible && this.isSecretsManagerStatusLoading)
        );
      }

      // when secretManagerStatus is null, the query has finished
      // and the secrets manager is just unprovisioned
      // but when it's undefined, it means the query hasn't run (waiting for entitlement state)
      // OR hasn't finished running yet
      return this.secretManagerStatus === undefined;
    },
    trialAlertOptions() {
      if (!this.isPaidExperienceEnabled || !this.entitlement) {
        return null;
      }

      const { state, onDemandEnabled, blockedReason } = this.entitlement;

      if (state === ENTITLEMENT_STATE_BLOCKED) {
        return TRIAL_ALERT_OPTIONS_BLOCKED[blockedReason];
      }

      if (state === ENTITLEMENT_STATE_TRIAL) {
        if (this.creditsRemainingPercentage <= TRIAL_CREDITS_LOW_PERCENTAGE) {
          return onDemandEnabled
            ? TRIAL_ALERT_OPTIONS_CREDITS_LOW.onDemandEnabled
            : TRIAL_ALERT_OPTIONS_CREDITS_LOW.onDemandDisabled;
        }
        if (this.isTrialExpiringSoon) {
          return onDemandEnabled
            ? TRIAL_ALERT_OPTIONS_TRIAL_EXPIRING.onDemandEnabled
            : TRIAL_ALERT_OPTIONS_TRIAL_EXPIRING.onDemandDisabled;
        }
      }

      return null;
    },
    trialAlertTitle() {
      if (!this.trialAlertOptions) {
        return '';
      }
      return sprintf(this.trialAlertOptions.title, {
        creditsRemaining: this.creditsRemainingPercentageText,
        trialDaysRemaining: this.trialDaysRemaining,
      });
    },
    trialDaysRemaining() {
      if (!this.entitlement.trialExpiresAt) {
        return null;
      }

      return getDayDifference(new Date(), new Date(this.entitlement.trialExpiresAt));
    },
  },
  methods: {
    showOpenbaoUnhealthyAlert() {
      createAlert({
        title: s__('SecretsManager|Cannot connect to OpenBao'),
        message: s__(
          'SecretsManager|Failed to connect with OpenBao. Secrets are currently unavailable, please try again later.',
        ),
      });
    },
    redirectToIndex() {
      if (this.$route?.name !== INDEX_ROUTE_NAME) {
        this.$router.push({ name: INDEX_ROUTE_NAME });
      }
    },
    showSecretsToast(message) {
      this.$toast.show(message);
    },
  },
};
</script>
<template>
  <gl-loading-icon
    v-if="showLoading"
    data-testid="secrets-manager-loading-status"
    class="gl-mt-5"
  />
  <div
    v-else-if="isProvisioning"
    data-testid="secrets-manager-provisioning-text"
    class="gl-mt-5 gl-text-center"
  >
    <div class="gl-flex gl-items-center gl-justify-center">
      <gl-loading-icon class="gl-mr-3 gl-mt-1" />
      <p class="gl-mb-0 gl-inline gl-text-size-h1 gl-font-semibold">
        {{ s__('SecretsManager|Provisioning in progress') }}
      </p>
    </div>
    <p class="gl-mt-4 gl-text-subtle">
      {{
        s__(
          'SecretsManager|Please wait while the secrets manager is provisioned. You can refresh at any time.',
        )
      }}
    </p>
  </div>
  <div v-else-if="!hasStatusError">
    <gl-alert
      v-if="isPaidExperienceEnabled && trialAlertOptions"
      :variant="trialAlertOptions.variant"
      :title="trialAlertTitle"
      :dismissible="false"
      class="gl-my-5"
      data-testid="secrets-trial-alert"
    >
      <gl-sprintf :message="trialAlertOptions.description">
        <template #link="{ content }">
          <gl-link :href="$options.GITLAB_CREDITS_DOCS_LINK" target="_blank">{{ content }}</gl-link>
        </template>
      </gl-sprintf>
    </gl-alert>
    <router-view ref="router-view" @show-secrets-toast="showSecretsToast" />
  </div>
</template>
