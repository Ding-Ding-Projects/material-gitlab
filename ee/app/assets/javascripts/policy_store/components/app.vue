<script>
import { GlAlert } from '@gitlab/ui';
import * as Sentry from '~/sentry/sentry_browser_wrapper';
import { s__ } from '~/locale';
import { visitUrl, joinPaths } from '~/lib/utils/url_utility';
// TODO: Replace the evaluations mock once the Policy Store exposes evaluation
// stats. Tracked in https://gitlab.com/gitlab-org/gitlab/-/work_items/604312
import { MOCK_EVALUATIONS_THIS_WEEK } from '../mock_data';
import { fetchPolicies } from '../policies';
import ListWrapper from './list/list_wrapper.vue';
import StepWizard from './editor/step_wizard.vue';

const VIEW_EDITOR = 'editor';

export default {
  name: 'PolicyStoreApp',
  components: {
    GlAlert,
    ListWrapper,
    StepWizard,
  },
  MOCK_EVALUATIONS_THIS_WEEK,
  i18n: {
    policiesError: s__(
      'PolicyStore|The policies could not be fetched from the Policy Store API. Refresh the page to try again.',
    ),
  },
  // The list, new, and edit pages each mount this app; initialView selects which
  // it renders. Navigation between them uses backend-provided paths; the per-policy
  // edit path is derived from listPath and the policy id until the API exposes it.
  inject: {
    organizationId: {},
    newPolicyPath: { default: '' },
    listPath: { default: '' },
    initialView: { default: 'list' },
    policyId: { default: '' },
  },
  data() {
    return {
      policies: [],
      policiesLoaded: false,
      policiesLoading: false,
      policiesError: false,
    };
  },
  computed: {
    isEditor() {
      return this.initialView === VIEW_EDITOR;
    },
    editingPolicy() {
      return this.policies.find(({ id }) => String(id) === this.policyId) || null;
    },
    listPolicies() {
      return this.policies.map((policy) => ({
        ...policy,
        editPath: this.listPath ? joinPaths(this.listPath, String(policy.id), 'edit') : '',
      }));
    },
  },
  created() {
    // The blank "new" page has no policy to resolve, so skip the list fetch there.
    if (!this.isEditor || this.policyId) this.loadPolicies();
  },
  methods: {
    async loadPolicies() {
      if (this.policiesLoaded || this.policiesLoading) return;

      this.policiesLoading = true;
      this.policiesError = false;

      try {
        this.policies = await fetchPolicies(this.organizationId);
        this.policiesLoaded = true;
      } catch (error) {
        Sentry.captureException(error);
        this.policies = [];
        this.policiesError = true;
      } finally {
        this.policiesLoading = false;
      }
    },
    returnToList() {
      if (this.listPath) visitUrl(this.listPath);
    },
  },
};
</script>

<template>
  <step-wizard v-if="isEditor" :policy="editingPolicy" @cancel="returnToList" />
  <div v-else>
    <gl-alert
      v-if="policiesError"
      variant="danger"
      :dismissible="false"
      class="gl-mt-4"
      data-testid="policies-error"
    >
      {{ $options.i18n.policiesError }}
    </gl-alert>
    <list-wrapper
      :policies="listPolicies"
      :loading="policiesLoading"
      :error="policiesError"
      :evaluations-this-week="$options.MOCK_EVALUATIONS_THIS_WEEK"
      :new-policy-path="newPolicyPath"
    />
  </div>
</template>
