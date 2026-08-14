<script>
import { GlAlert, GlSkeletonLoader } from '@gitlab/ui';
import { s__, sprintf } from '~/locale';
import PageHeading from '~/vue_shared/components/page_heading.vue';
import NotFound from '../../components/not_found.vue';
import {
  PAGE_NOT_FOUND_TITLE,
  REPOSITORY_FORMAT_LABELS,
  REPOSITORY_FORMAT_LOGO_SIZE_HEADING,
} from '../../constants';
import getArtifactQuery from '../../graphql/queries/get_artifact.query.graphql';
import { artifactDisplayName } from '../../utils';
import FormatLogo from '../components/format_logo.vue';

export default {
  name: 'ArtifactRegistryVersionList',
  components: {
    FormatLogo,
    GlAlert,
    GlSkeletonLoader,
    NotFound,
    PageHeading,
  },
  inject: ['breadCrumbState', 'organizationGid'],
  data() {
    return {
      repository: undefined,
      hasError: false,
    };
  },
  apollo: {
    repository: {
      query: getArtifactQuery,
      variables() {
        return {
          organizationId: this.organizationGid,
          name: this.repositoryName,
          artifactId: this.artifactId,
        };
      },
      update: ({ organization }) => organization?.artifactRegistryRepository ?? null,
      result({ error }) {
        this.hasError = Boolean(error);
      },
      error() {
        this.hasError = true;
      },
    },
  },
  computed: {
    repositoryName() {
      return this.$route.params.id;
    },
    artifactId() {
      return this.$route.params.artifactId;
    },
    isLoading() {
      return this.$apollo.queries.repository.loading;
    },
    format() {
      return this.repository?.format;
    },
    artifact() {
      return this.repository?.image ?? this.repository?.package ?? null;
    },
    displayName() {
      return artifactDisplayName(this.artifact, this.format);
    },
    formatLabel() {
      return REPOSITORY_FORMAT_LABELS[this.format];
    },
    // A missing repository and a missing artifact render one outcome, so the view never
    // confirms that an artifact the viewer cannot see exists.
    isNotFound() {
      return !this.isLoading && !this.hasError && !this.artifact;
    },
    isPopulated() {
      return Boolean(this.artifact);
    },
    statusMessage() {
      if (this.hasError) return this.$options.i18n.unavailable;
      if (this.isLoading) return this.$options.i18n.loading;
      if (this.isNotFound) return this.$options.i18n.notFound;

      return sprintf(this.$options.i18n.loaded, { name: this.displayName });
    },
  },
  watch: {
    displayName: {
      immediate: true,
      handler(name) {
        this.breadCrumbState.updateName(name);
      },
    },
  },
  beforeDestroy() {
    this.breadCrumbState.updateName('');
  },
  i18n: {
    unavailable: s__('ArtifactRegistry|The Artifact Registry service is unavailable.'),
    loading: s__('ArtifactRegistry|Loading artifact details.'),
    loaded: s__('ArtifactRegistry|Artifact details for %{name} loaded.'),
    notFound: PAGE_NOT_FOUND_TITLE,
  },
  logoSize: REPOSITORY_FORMAT_LOGO_SIZE_HEADING,
};
</script>

<template>
  <div>
    <span
      class="gl-sr-only"
      aria-live="polite"
      aria-atomic="true"
      data-testid="versions-announcement"
      >{{ statusMessage }}</span
    >

    <gl-skeleton-loader v-if="isLoading" :lines="2" :width="500" class="gl-mt-4" />

    <gl-alert v-else-if="hasError" variant="danger" :dismissible="false">
      {{ $options.i18n.unavailable }}
    </gl-alert>

    <not-found v-else-if="isNotFound" />

    <page-heading v-else-if="isPopulated">
      <template #heading>
        <span class="gl-flex gl-flex-wrap gl-items-center gl-gap-3">
          <format-logo :format="format" :size="$options.logoSize" />
          <span class="gl-sr-only" data-testid="artifact-format-name">{{ formatLabel }}</span>
          <span class="gl-wrap-anywhere" data-testid="artifact-name">{{ displayName }}</span>
        </span>
      </template>
    </page-heading>
  </div>
</template>
