<script>
import {
  GlButton,
  GlCollapsibleListbox,
  GlFormInput,
  GlSkeletonLoader,
  GlTooltipDirective,
} from '@gitlab/ui';
import * as Sentry from '~/sentry/sentry_browser_wrapper';
import axios from '~/lib/utils/axios_utils';
import SafeHtml from '~/vue_shared/directives/safe_html';
import { localTimeAgo } from '~/lib/utils/datetime_utility';
import { s__ } from '~/locale';
import { InternalEvents } from '~/tracking';
import { activityDashboardPath } from '~/lib/utils/path_helpers/dashboard';
import { userActivityPath } from '~/lib/utils/path_helpers/user';
import { RegexBuilder } from '~/material_system';
import AnchoredRegexBuilder from '~/todos/components/anchored_regex_builder.vue';
import {
  EVENT_USER_CLICKS_LINK_ON_ACTIVITY_FEED,
  TRACKING_SCOPE_YOUR_ACTIVITY,
  TRACKING_SCOPE_YOUR_PROJECTS,
  TRACKING_SCOPE_STARRED_PROJECTS,
  TRACKING_SCOPE_FOLLOWED_USERS,
} from '../tracking_constants';
import BaseWidget from './base_widget.vue';

const MAX_EVENTS = 5;
const FILTER_OPTIONS = [
  {
    value: null,
    text: s__('HomepageActivityWidget|Your activity'),
    description: s__(
      'HomepageActivityWidget|Your contributions, like commits and work on issues and merge requests.',
    ),
    scope: TRACKING_SCOPE_YOUR_ACTIVITY,
  },
  {
    value: 'your_projects',
    text: s__('HomepageActivityWidget|Your projects'),
    description: s__('HomepageActivityWidget|Activity in projects you own or are a member of.'),
    scope: TRACKING_SCOPE_YOUR_PROJECTS,
  },
  {
    value: 'starred',
    text: s__('HomepageActivityWidget|Starred projects'),
    description: s__('HomepageActivityWidget|Activity in projects you have starred.'),
    scope: TRACKING_SCOPE_STARRED_PROJECTS,
  },
  {
    value: 'followed',
    text: s__('HomepageActivityWidget|Followed users'),
    description: s__('HomepageActivityWidget|Activity from users you follow.'),
    scope: TRACKING_SCOPE_FOLLOWED_USERS,
  },
];

export default {
  name: 'ActivityWidget',
  components: {
    AnchoredRegexBuilder,
    GlButton,
    GlSkeletonLoader,
    GlCollapsibleListbox,
    GlFormInput,
    BaseWidget,
  },
  directives: {
    SafeHtml,
    GlTooltip: GlTooltipDirective,
  },
  mixins: [InternalEvents.mixin()],
  props: {
    activityPath: {
      type: String,
      required: true,
    },
  },
  data() {
    return {
      activityFeedHtml: null,
      isLoading: true,
      hasError: false,
      filter: this.getPersistedFilter(),
      filterSearch: '',
      filterSearchIsRegex: false,
      filterSearchFlags: 'i',
    };
  },
  computed: {
    selectedFilterText() {
      const selectedOption = FILTER_OPTIONS.find((option) => option.value === this.filter);
      return selectedOption ? selectedOption.text : s__('HomepageActivityWidget|Your activity');
    },
    filterSearchCorpus() {
      return FILTER_OPTIONS.map((option) => `${option.text} ${option.description}`);
    },
    filteredFilterOptions() {
      const query = this.filterSearch.trim();
      if (!query) return FILTER_OPTIONS;
      const builder = new RegexBuilder({
        pattern: query,
        flags: this.filterSearchFlags.replace(/[gy]/g, ''),
        regex: this.filterSearchIsRegex,
      });
      return FILTER_OPTIONS.filter((option) => {
        const state = builder.update({
          sample: `${option.text} ${option.description}`,
        });
        return state.syntax.valid && state.matches.length > 0;
      });
    },
  },
  watch: {
    filter: {
      handler: 'onFilterChange',
      immediate: false,
    },
  },
  created() {
    this.reload();
  },
  methods: {
    toggleFilterSearchMode() {
      this.filterSearchIsRegex = !this.filterSearchIsRegex;
    },
    applyFilterRegex({ pattern, flags, isRegex }) {
      this.filterSearch = pattern;
      this.filterSearchFlags = flags;
      this.filterSearchIsRegex = isRegex;
    },
    getPersistedFilter() {
      try {
        const savedFilter = sessionStorage.getItem('homepage-activity-filter');
        const validValues = this.$options.FILTER_OPTIONS.map((option) => option.value);
        return validValues.includes(savedFilter) ? savedFilter : null;
      } catch (e) {
        return null;
      }
    },

    handleActivityClick(event) {
      const clickedLink = event.target.closest('a');

      if (clickedLink && clickedLink.href) {
        const currentFilter = this.$options.FILTER_OPTIONS.find(
          (option) => option.value === this.filter,
        );
        this.trackEvent(EVENT_USER_CLICKS_LINK_ON_ACTIVITY_FEED, {
          label: currentFilter.scope,
        });
      }
    },

    onFilterChange(newFilter) {
      try {
        if (newFilter === null) {
          sessionStorage.removeItem('homepage-activity-filter');
        } else {
          sessionStorage.setItem('homepage-activity-filter', newFilter);
        }
      } catch (e) {
        return null;
      }
      this.reload();
      return null;
    },

    async reload() {
      this.isLoading = true;

      try {
        /**
         * As part of this widget's first iteration, we have slightly changed how the `UsersController`
         * controller behaves so that it returns an empty response when the user has no activity and
         * the `is_personal_homepage` param is present. This is a temporary workaround until we can
         * move away from an HTML endpoint and handle empty states more gracefully in the client.
         * We'll need to remove the `is_personal_homepage` logic from `UsersController` once we have
         * a proper GraphQL endpoint here.
         */
        const url = this.filter
          ? activityDashboardPath({
              limit: MAX_EVENTS,
              offset: 0,
              filter: this.filter,
            })
          : userActivityPath(gon.current_username, {
              limit: MAX_EVENTS,
              is_personal_homepage: 1,
            });
        const { data } = await axios.get(url);
        if (data?.html) {
          const parser = new DOMParser();
          const resp = parser.parseFromString(data.html, 'text/html');
          const timestamps = resp.querySelectorAll('.js-timeago');
          if (timestamps.length > 0) {
            localTimeAgo(timestamps);
          }
          this.activityFeedHtml = resp.body.innerHTML;
        }
      } catch (e) {
        Sentry.captureException(e);
        this.hasError = true;
      } finally {
        this.isLoading = false;
      }
    },
  },
  FILTER_OPTIONS,
  i18n: {
    filterSearch: s__('HomepageActivityWidget|Search activity filters'),
    regexMode: s__('HomepageActivityWidget|Use regular expression matching for activity filters'),
    plainTextMode: s__('HomepageActivityWidget|Use plain text matching for activity filters'),
    regexBuilder: s__('HomepageActivityWidget|Build an activity filter expression'),
  },
};
</script>

<template>
  <base-widget data-testid="homepage-activity-widget" @visible="reload">
    <div
      class="homepage-widget-heading gl-flex gl-flex-wrap gl-items-center gl-justify-between gl-gap-2"
    >
      <div class="gl-flex gl-items-center gl-gap-2">
        <h2 class="gl-heading-4 gl-m-0">
          {{ __('Follow the latest updates') }}
        </h2>
      </div>

      <div class="homepage-widget-filter gl-flex gl-flex-wrap gl-items-center gl-gap-2">
        <div class="homepage-widget-filter__search gl-flex gl-min-w-0 gl-items-center gl-gap-1">
          <gl-form-input
            v-model="filterSearch"
            type="search"
            class="homepage-widget-filter__input"
            :placeholder="$options.i18n.filterSearch"
            :aria-label="$options.i18n.filterSearch"
          />
          <gl-button
            class="homepage-widget-filter__mode"
            :selected="filterSearchIsRegex"
            :aria-pressed="filterSearchIsRegex"
            :aria-label="
              filterSearchIsRegex ? $options.i18n.plainTextMode : $options.i18n.regexMode
            "
            :title="filterSearchIsRegex ? $options.i18n.plainTextMode : $options.i18n.regexMode"
            @click="toggleFilterSearchMode"
            >.*</gl-button
          >
          <anchored-regex-builder
            :value="filterSearchIsRegex ? filterSearch : ''"
            :corpus="filterSearchCorpus"
            :title="$options.i18n.regexBuilder"
            @apply="applyFilterRegex"
          />
        </div>
        <gl-collapsible-listbox
          v-model="filter"
          searchable
          :items="filteredFilterOptions"
          :toggle-text="selectedFilterText"
        >
          <template #list-item="{ item }">
            <div class="gl-flex gl-w-full gl-flex-col gl-gap-1">
              <div class="gl-font-weight-semibold gl-text-default">
                {{ item.text }}
              </div>
              <div class="gl-line-height-normal gl-text-sm gl-text-subtle">
                {{ item.description }}
              </div>
            </div>
          </template>
        </gl-collapsible-listbox>
      </div>
    </div>

    <div v-if="isLoading" class="gl-flex gl-flex-col gl-gap-y-4 gl-py-4">
      <div v-for="i in 5" :key="i" class="gl-flex gl-items-center gl-justify-between">
        <gl-skeleton-loader :width="300" :lines="1" :equal-width-lines="true" />
        <gl-skeleton-loader :width="50" :lines="1" :equal-width-lines="true" />
      </div>
    </div>

    <p v-else-if="hasError" class="gl-mb-0 gl-pt-3">
      {{
        s__(
          'HomepageActivityWidget|Your activity feed is not available. Please refresh the page to try again.',
        )
      }}
    </p>
    <p v-else-if="!activityFeedHtml" data-testid="empty-state">
      {{
        s__(
          'HomepageActivityWidget|Start creating merge requests, pushing code, commenting in issues, and doing other work to view a feed of your activity here.',
        )
      }}
    </p>
    <ul
      v-else
      v-safe-html="activityFeedHtml"
      data-testid="events-list"
      class="gl-list-none gl-p-0"
      :class="{ 'user-activity-feed': filter === null }"
      @click="handleActivityClick"
    ></ul>
    <a :href="activityPath">{{ __('All activity') }}</a>
  </base-widget>
</template>

<style scoped>
.homepage-widget-filter__search {
  padding: 0.125rem 0.25rem 0.125rem 0.75rem;
  border: 1px solid var(--homepage-outline, var(--gl-color-border-subtle));
  border-radius: 999px;
  background: var(--homepage-surface-container, var(--gl-color-neutral-50));
}

.homepage-widget-filter__input {
  width: min(14rem, 34vw);
  min-width: 8rem;
  border: 0;
  background: transparent;
  box-shadow: none;
}

.homepage-widget-filter__mode {
  min-width: 2.5rem;
  border-radius: 999px;
  font-family: var(--gl-font-family-monospace);
  font-weight: 700;
}

::v-deep .user-profile-activity .system-note-image {
  width: 22px;
  height: 22px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background-color: var(--gl-background-color-strong);
}

::v-deep .user-profile-activity svg {
  width: 16px;
  height: 16px;
}

::v-deep .user-profile-activity:not(:last-child)::before {
  content: '';
  position: absolute;
  width: 2px;
  left: 10px;
  top: 20px;
  background-color: var(--gl-background-color-strong);
  height: 100%;
}

::v-deep .project-activity-item:not(:last-child)::before {
  content: '';
  position: absolute;
  width: 2px;
  left: 15px;
  top: 20px;
  height: 100%;
  background-color: var(--gl-background-color-strong);
}

@media (max-width: 48rem) {
  .homepage-widget-filter,
  .homepage-widget-filter__search {
    width: 100%;
  }

  .homepage-widget-filter__input {
    width: auto;
    flex: 1;
  }
}
</style>
