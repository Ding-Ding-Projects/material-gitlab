<script>
import { GlAlert, GlCard, GlSkeletonLoader } from '@gitlab/ui';
import ClipboardButton from '~/vue_shared/components/clipboard_button.vue';
import { localeDateFormat, newDate } from '~/lib/utils/datetime_utility';
import { s__ } from '~/locale';
import { REGISTRY_STATUS_INDICATIONS, REGISTRY_STATUS_INDICATION_UNKNOWN } from '../constants';
import getArtifactRegistryQuery from '../graphql/queries/get_artifact_registry.query.graphql';
import { buildRegistryClientUrl } from '../utils';

export default {
  name: 'ArtifactRegistryActivationSection',
  components: {
    ClipboardButton,
    GlAlert,
    GlCard,
    GlSkeletonLoader,
  },
  inject: ['organizationGid', 'clientBaseUrl'],
  data() {
    return {
      registry: undefined,
      hasError: false,
    };
  },
  apollo: {
    registry: {
      query: getArtifactRegistryQuery,
      variables() {
        return { organizationId: this.organizationGid };
      },
      update: ({ organization }) => organization?.artifactRegistry ?? null,
      result({ error }) {
        this.hasError = Boolean(error);
      },
      error() {
        this.hasError = true;
      },
    },
  },
  computed: {
    isLoading() {
      return this.$apollo.queries.registry.loading;
    },
    // A null field is a failed resolution, not a missing registry: the route already
    // answers not-found without a mapping row.
    isUnavailable() {
      return this.hasError || this.registry === null;
    },
    clientUrl() {
      return buildRegistryClientUrl({
        clientBaseUrl: this.clientBaseUrl,
        handle: this.registry.handle,
      });
    },
    activeSince() {
      return localeDateFormat.asDate.format(newDate(this.registry.createdAt));
    },
    // `Object.hasOwn` rather than indexing straight into the map, so an inherited property
    // name such as `constructor` arriving as a status reads as unrecognized.
    indication() {
      const { status } = this.registry;

      return Object.hasOwn(REGISTRY_STATUS_INDICATIONS, status)
        ? REGISTRY_STATUS_INDICATIONS[status]
        : REGISTRY_STATUS_INDICATION_UNKNOWN;
    },
  },
  i18n: {
    unavailable: s__('ArtifactRegistry|The Artifact Registry service is unavailable.'),
    handle: s__('ArtifactRegistry|Registry handle'),
    url: s__('ArtifactRegistry|Registry URL'),
    activeSince: s__('ArtifactRegistry|Active since'),
    copyHandle: s__('ArtifactRegistry|Copy registry handle'),
    copyUrl: s__('ArtifactRegistry|Copy registry URL'),
  },
};
</script>

<template>
  <gl-skeleton-loader v-if="isLoading" :lines="3" :width="400" />

  <gl-alert v-else-if="isUnavailable" variant="danger" :dismissible="false">
    {{ $options.i18n.unavailable }}
  </gl-alert>

  <gl-card v-else>
    <template #header>
      <h3 class="gl-my-0 gl-text-base" data-testid="registry-status">{{ indication }}</h3>
    </template>

    <dl class="gl-mb-0 gl-flex gl-flex-col gl-gap-2" data-testid="registry-identity">
      <div class="gl-flex gl-items-center gl-gap-2">
        <dt class="gl-w-18 gl-shrink-0 gl-font-normal gl-text-subtle">
          {{ $options.i18n.handle }}
        </dt>
        <dd class="gl-mb-0" data-testid="registry-handle">{{ registry.handle }}</dd>
        <clipboard-button
          :text="registry.handle"
          :title="$options.i18n.copyHandle"
          category="tertiary"
          size="small"
        />
      </div>

      <!-- No registry URL rather than one with a hole in it: the builder returns null
           where the instance configures no usable Artifact Registry origin. -->
      <div v-if="clientUrl" class="gl-flex gl-items-center gl-gap-2">
        <dt class="gl-w-18 gl-shrink-0 gl-font-normal gl-text-subtle">{{ $options.i18n.url }}</dt>
        <dd class="gl-mb-0 gl-font-monospace" data-testid="registry-url">{{ clientUrl }}</dd>
        <clipboard-button
          :text="clientUrl"
          :title="$options.i18n.copyUrl"
          category="tertiary"
          size="small"
        />
      </div>

      <div class="gl-flex gl-items-center gl-gap-2">
        <dt class="gl-w-18 gl-shrink-0 gl-font-normal gl-text-subtle">
          {{ $options.i18n.activeSince }}
        </dt>
        <dd class="gl-mb-0" data-testid="registry-active-since">{{ activeSince }}</dd>
      </div>
    </dl>
  </gl-card>
</template>
