<script>
import {
  GlButton,
  GlEmptyState,
  GlFilteredSearchToken,
  GlFormInput,
  GlKeysetPagination,
  GlLoadingIcon,
} from '@gitlab/ui';
import EMPTY_STATE_SVG_URL from '@gitlab/svgs/dist/illustrations/empty-state/empty-activity-md.svg?url';
import { DEFAULT_PER_PAGE } from '~/api';
import { __, s__ } from '~/locale';
import axios from '~/lib/utils/axios_utils';
import { createAlert } from '~/alert';
import { VARIANT_AVATAR } from '~/contribution_events/constants';
import { OPERATORS_IS } from '~/vue_shared/components/filtered_search_bar/constants';
import FilteredSearchBar from '~/vue_shared/components/filtered_search_bar/filtered_search_bar_root.vue';
import ContributionEvents from '~/contribution_events/components/contribution_events.vue';
import { RegexBuilder } from '~/material_system';
import AnchoredRegexBuilder from '~/todos/components/anchored_regex_builder.vue';
import {
  CONTRIBUTION_TYPE_FILTER_TYPE,
  RECENT_SEARCHES_STORAGE_KEY,
  FILTERED_SEARCH_NAMESPACE,
  convertTokensToFilter,
} from '../filters';

export default {
  name: 'OrganizationsActivityApp',
  i18n: {
    emptyStateTitle: __('No activities found'),
    eventsErrorMessage: s__(
      'Organization|An error occurred loading the activity. Please refresh the page to try again.',
    ),
    contributionType: __('Contribution type'),
    heading: s__('Organization|Activity'),
    description: s__(
      'Organization|Review recent contributions across the organization without losing the current server filters.',
    ),
    localSearch: s__('Organization|Search loaded activity'),
    regexMode: s__('Organization|Use regular expression matching'),
    plainTextMode: s__('Organization|Use plain text matching'),
    regexBuilderTitle: s__('Organization|Build an activity search expression'),
  },
  components: {
    AnchoredRegexBuilder,
    FilteredSearchBar,
    ContributionEvents,
    GlButton,
    GlEmptyState,
    GlFormInput,
    GlKeysetPagination,
    GlLoadingIcon,
  },
  props: {
    organizationActivityPath: {
      type: String,
      required: true,
    },
    organizationActivityEventTypes: {
      type: Array,
      required: true,
    },
    organizationActivityAllEvent: {
      type: String,
      required: true,
    },
  },
  data() {
    return {
      events: [],
      eventsLoading: false,
      eventFilter: this.organizationActivityAllEvent,
      hasNextPage: false,
      hasPreviousPage: false,
      currentOffset: 0,
      localSearch: '',
      localSearchIsRegex: false,
      localSearchFlags: 'i',
    };
  },
  computed: {
    showEmptyState() {
      return !this.eventsLoading && !this.visibleEvents.length;
    },
    paginationInfo() {
      return {
        hasNextPage: this.hasNextPage,
        hasPreviousPage: this.hasPreviousPage,
      };
    },
    availableTokens() {
      return [
        {
          title: this.$options.i18n.contributionType,
          icon: 'comparison',
          type: CONTRIBUTION_TYPE_FILTER_TYPE,
          token: GlFilteredSearchToken,
          unique: true,
          operators: OPERATORS_IS,
          options: this.organizationActivityEventTypes,
        },
      ];
    },
    eventSearchCorpus() {
      return this.events.map((event) => this.eventSearchText(event));
    },
    localSearchSyntax() {
      if (!this.localSearchIsRegex || !this.localSearch) return { valid: true, message: '' };
      return new RegexBuilder({
        pattern: this.localSearch,
        flags: this.localSearchFlags.replace(/[gy]/g, ''),
        regex: true,
      }).snapshot().syntax;
    },
    visibleEvents() {
      const query = this.localSearch.trim();
      if (!query) return this.events;

      const builder = new RegexBuilder({
        pattern: query,
        flags: this.localSearchFlags.replace(/[gy]/g, ''),
        regex: this.localSearchIsRegex,
      });
      return this.events.filter((event) => {
        const snapshot = builder.update({
          sample: this.eventSearchText(event),
        });
        return snapshot.syntax.valid && snapshot.matches.length > 0;
      });
    },
  },
  async mounted() {
    this.fetchEvents();
  },
  methods: {
    eventSearchText(event) {
      return [
        event.author?.name,
        event.author?.username,
        event.project?.name,
        event.project?.fullPath,
        event.action,
        event.targetTitle,
        event.title,
        event.note,
      ]
        .filter(Boolean)
        .join(' ');
    },
    toggleLocalSearchMode() {
      this.localSearchIsRegex = !this.localSearchIsRegex;
    },
    applyRegex({ pattern, flags, isRegex }) {
      this.localSearch = pattern;
      this.localSearchFlags = flags;
      this.localSearchIsRegex = isRegex;
    },
    onSearchFilter(tokens) {
      this.eventFilter = convertTokensToFilter(tokens) || this.organizationActivityAllEvent;
      this.currentOffset = 0;
      this.hasPreviousPage = false;
      this.fetchEvents();
    },
    async fetchEvents(offset = 0) {
      this.eventsLoading = true;

      try {
        const {
          data: { events, has_next_page: hasNextPage },
        } = await axios.get(this.organizationActivityPath, {
          params: {
            offset,
            limit: DEFAULT_PER_PAGE,
            event_filter: this.eventFilter,
          },
        });

        this.hasNextPage = hasNextPage;
        this.hasPreviousPage = offset > 0;
        this.currentOffset = offset;
        this.events = events;
      } catch (error) {
        createAlert({
          message: this.$options.i18n.eventsErrorMessage,
          error,
          captureError: true,
        });
      } finally {
        this.eventsLoading = false;
      }
    },
    handleNextPage() {
      const nextOffset = this.currentOffset + DEFAULT_PER_PAGE;
      this.fetchEvents(nextOffset);
    },
    handlePrevPage() {
      const prevOffset = Math.max(0, this.currentOffset - DEFAULT_PER_PAGE);
      this.fetchEvents(prevOffset);
    },
  },
  EMPTY_STATE_SVG_URL,
  RECENT_SEARCHES_STORAGE_KEY,
  FILTERED_SEARCH_NAMESPACE,
  VARIANT_AVATAR,
};
</script>

<template>
  <section class="organization-activity" :aria-label="$options.i18n.heading">
    <header class="organization-activity__header">
      <div>
        <h2 class="organization-activity__title">
          {{ $options.i18n.heading }}
        </h2>
        <p class="organization-activity__description">
          {{ $options.i18n.description }}
        </p>
      </div>
    </header>

    <div class="organization-activity__toolbar gl-flex gl-flex-col gl-gap-3">
      <div class="organization-activity__local-search gl-flex gl-min-w-0 gl-items-center gl-gap-2">
        <gl-form-input
          v-model="localSearch"
          type="search"
          class="organization-activity__local-input gl-min-w-0 gl-flex-grow"
          :placeholder="$options.i18n.localSearch"
          :aria-label="$options.i18n.localSearch"
          data-testid="organization-activity-local-search"
        />
        <gl-button
          class="organization-activity__mode"
          :selected="localSearchIsRegex"
          :aria-pressed="localSearchIsRegex"
          :aria-label="localSearchIsRegex ? $options.i18n.plainTextMode : $options.i18n.regexMode"
          :title="localSearchIsRegex ? $options.i18n.plainTextMode : $options.i18n.regexMode"
          @click="toggleLocalSearchMode"
          >.*</gl-button
        >
        <anchored-regex-builder
          :value="localSearchIsRegex ? localSearch : ''"
          :corpus="eventSearchCorpus"
          :title="$options.i18n.regexBuilderTitle"
          @apply="applyRegex"
        />
      </div>
      <p v-if="!localSearchSyntax.valid" class="gl-mb-0 gl-text-danger" role="alert">
        {{ localSearchSyntax.message }}
      </p>
      <filtered-search-bar
        :recent-searches-storage-key="$options.RECENT_SEARCHES_STORAGE_KEY"
        :namespace="$options.FILTERED_SEARCH_NAMESPACE"
        :tokens="availableTokens"
        terms-as-tokens
        @onFilter="onSearchFilter"
      />
    </div>

    <template v-if="!showEmptyState">
      <div class="organization-activity__feed">
        <contribution-events
          :events="visibleEvents"
          :variant="$options.VARIANT_AVATAR"
          class="gl-mt-5"
        />
      </div>
      <gl-loading-icon v-if="eventsLoading" size="md" class="gl-mb-3" />
      <gl-keyset-pagination
        v-else
        v-bind="paginationInfo"
        class="gl-my-6 gl-flex gl-justify-center"
        @prev="handlePrevPage"
        @next="handleNextPage"
      />
    </template>

    <gl-empty-state
      v-else-if="showEmptyState"
      :title="$options.i18n.emptyStateTitle"
      :svg-path="$options.EMPTY_STATE_SVG_URL"
    />
  </section>
</template>

<style scoped>
.organization-activity {
  --activity-surface: var(--m3-color-surface, var(--gl-color-neutral-0));
  --activity-container: var(
    --m3-color-surface-container,
    var(--gl-color-surface-container-low, var(--gl-color-neutral-50))
  );
  --activity-outline: var(--m3-color-outline, var(--gl-color-border-subtle));
  --activity-primary: var(--m3-color-primary, var(--gl-color-text-link));

  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.organization-activity__header,
.organization-activity__toolbar,
.organization-activity__feed {
  border: 1px solid var(--activity-outline);
  border-radius: 1rem;
  background: var(--activity-surface);
}

.organization-activity__header {
  padding: clamp(1rem, 3vw, 1.5rem);
  background: var(--activity-container);
}

.organization-activity__title {
  margin: 0;
  color: var(--gl-color-text-default);
  font-size: 1.5rem;
  font-weight: 600;
  line-height: 2rem;
}

.organization-activity__description {
  max-width: 48rem;
  margin: 0.5rem 0 0;
  color: var(--gl-color-text-subtle);
}

.organization-activity__toolbar {
  padding: 1rem;
  background: var(--activity-container);
}

.organization-activity__local-search {
  max-width: 52rem;
  padding: 0.25rem 0.375rem 0.25rem 1rem;
  border: 1px solid transparent;
  border-radius: 999px;
  background: var(--activity-surface);
}

.organization-activity__local-search:focus-within {
  border-color: var(--activity-primary);
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--activity-primary) 18%, transparent);
}

.organization-activity__local-input {
  border: 0;
  background: transparent;
  box-shadow: none;
}

.organization-activity__mode {
  min-width: 2.75rem;
  border-radius: 999px;
  font-family: var(--gl-font-family-monospace);
  font-weight: 700;
}

.organization-activity__feed {
  padding: 0 1rem;
  overflow: hidden;
  box-shadow: 0 1px 3px rgb(0 0 0 / 10%);
}

.organization-activity :is(button, a, input):focus-visible {
  outline: 3px solid var(--activity-primary);
  outline-offset: 2px;
}

@media (prefers-reduced-motion: reduce) {
  .organization-activity * {
    scroll-behavior: auto !important;
    transition-duration: 0s !important;
  }
}
</style>
