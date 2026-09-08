<script>
import { computed } from 'vue';
import {
  GlButton,
  GlCollapsibleListbox,
  GlFormInput,
  GlSkeletonLoader,
  GlTooltipDirective,
} from '@gitlab/ui';
import emptyTodosAllDoneSvg from '@gitlab/svgs/dist/illustrations/status/status-success-sm.svg';
import emptyTodosFilteredSvg from '@gitlab/svgs/dist/illustrations/search-sm.svg';
import { s__ } from '~/locale';
import { InternalEvents } from '~/tracking';
import { dashboardTodosPath } from '~/lib/utils/path_helpers/dashboard';
import * as Sentry from '~/sentry/sentry_browser_wrapper';
import { RegexBuilder } from '~/material_system';
import {
  TABS_INDICES,
  TODO_ACTION_TYPE_BUILD_FAILED,
  TODO_ACTION_TYPE_DIRECTLY_ADDRESSED,
  TODO_ACTION_TYPE_ASSIGNED,
  TODO_ACTION_TYPE_MENTIONED,
  TODO_ACTION_TYPE_REVIEW_REQUESTED,
  TODO_ACTION_TYPE_UNMERGEABLE,
} from '~/todos/constants';
import TodoItem from '~/todos/components/todo_item.vue';
import getTodosQuery from '~/todos/components/queries/get_todos.query.graphql';
import AnchoredRegexBuilder from '~/todos/components/anchored_regex_builder.vue';
import {
  EVENT_USER_FOLLOWS_LINK_ON_HOMEPAGE,
  TRACKING_LABEL_TODO_ITEMS,
  TRACKING_PROPERTY_ALL_TODOS,
} from '../tracking_constants';
import BaseWidget from './base_widget.vue';

const N_TODOS = 5;
const N_TODOS_FETCH = 15;

const FILTER_OPTIONS = [
  {
    value: null,
    text: s__('Todos|Everything'),
    description: s__('Todos|All your pending to-do items across GitLab.'),
  },
  {
    value: TODO_ACTION_TYPE_ASSIGNED,
    text: s__('Todos|Assignments'),
    description: s__('Todos|Items assigned to you.'),
  },
  {
    value: `${TODO_ACTION_TYPE_MENTIONED};${TODO_ACTION_TYPE_DIRECTLY_ADDRESSED}`,
    text: s__('Todos|Mentions'),
    description: s__('Todos|Items where you were mentioned (@username).'),
  },
  {
    value: TODO_ACTION_TYPE_BUILD_FAILED,
    text: s__('Todos|Failed builds'),
    description: s__('Todos|Merge requests with failed pipelines.'),
  },
  {
    value: TODO_ACTION_TYPE_UNMERGEABLE,
    text: s__('Todos|Unmergeable changes'),
    description: s__(
      'Todos|Merge requests that cannot be merged due to conflicts or other issues.',
    ),
  },
  {
    value: TODO_ACTION_TYPE_REVIEW_REQUESTED,
    text: s__('Todos|Requested reviews'),
    description: s__('Todos|Merge requests that require your review or approval.'),
  },
];

export default {
  name: 'TodosWidget',
  components: {
    AnchoredRegexBuilder,
    TodoItem,
    GlButton,
    GlCollapsibleListbox,
    GlFormInput,
    GlSkeletonLoader,
    BaseWidget,
  },
  directives: {
    GlTooltip: GlTooltipDirective,
  },
  mixins: [InternalEvents.mixin()],
  provide() {
    return {
      currentTab: TABS_INDICES.pending,
      currentTime: new Date(),
      currentUserId: computed(() => this.currentUserId),
    };
  },
  data() {
    return {
      currentUserId: null,
      filter: null,
      todos: [],
      showLoading: true,
      hasError: false,
      filterSearch: '',
      filterSearchIsRegex: false,
      filterSearchFlags: 'i',
    };
  },
  computed: {
    todoTrackingContext() {
      return { source: 'personal_homepage' };
    },
    selectedFilterText() {
      const selectedOption = FILTER_OPTIONS.find((option) => option.value === this.filter);
      return selectedOption ? selectedOption.text : s__('Todos|All');
    },
    displayedTodos() {
      return this.todos.slice(0, N_TODOS);
    },
    todosPath() {
      return dashboardTodosPath();
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
  apollo: {
    todos: {
      query: getTodosQuery,
      variables() {
        return {
          first: N_TODOS_FETCH,
          state: ['pending'],
          action: this.filter ? this.filter.split(';') : null,
        };
      },
      update({ currentUser: { id, todos: { nodes = [] } } = {} }) {
        this.currentUserId = id;
        this.showLoading = false;

        return nodes;
      },
      error(error) {
        Sentry.captureException(error);
        this.showLoading = false;
        this.hasError = true;
      },
    },
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
    reload() {
      this.showLoading = true;
      this.hasError = false;
      this.$apollo.queries.todos.refetch();
    },
    handleViewAllClick() {
      this.trackEvent(EVENT_USER_FOLLOWS_LINK_ON_HOMEPAGE, {
        label: TRACKING_LABEL_TODO_ITEMS,
        property: TRACKING_PROPERTY_ALL_TODOS,
      });
    },
  },

  emptyTodosAllDoneSvg,
  emptyTodosFilteredSvg,
  FILTER_OPTIONS,
  i18n: {
    filterSearch: s__('Todos|Search to-do filters'),
    regexMode: s__('Todos|Use regular expression matching for to-do filters'),
    plainTextMode: s__('Todos|Use plain text matching for to-do filters'),
    regexBuilder: s__('Todos|Build a to-do filter expression'),
  },
};
</script>

<template>
  <base-widget data-testid="homepage-todos-widget" @visible="reload">
    <div
      class="homepage-widget-heading gl-mb-2 gl-flex gl-flex-wrap gl-items-center gl-justify-between gl-gap-2"
    >
      <div class="gl-flex gl-items-center gl-gap-2">
        <h2 class="gl-heading-4 gl-m-0 gl-grow">
          {{ __('Items that need your attention') }}
        </h2>
      </div>

      <div
        v-if="!hasError"
        class="homepage-widget-filter gl-flex gl-flex-wrap gl-items-center gl-gap-2"
      >
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

    <p v-if="hasError" class="gl-mb-3">
      {{
        s__(
          'HomePageTodosWidget|Your to-do items are not available. Please refresh the page to try again.',
        )
      }}
    </p>
    <template v-else>
      <div
        v-if="showLoading && $apollo.queries.todos.loading"
        class="gl-flex gl-flex-col gl-gap-y-4 gl-py-4"
      >
        <div v-for="i in 5" :key="i" class="gl-flex gl-items-center gl-justify-between">
          <gl-skeleton-loader :width="300" :lines="2" />
          <gl-skeleton-loader :width="50" :lines="1" :equal-width-lines="true" />
        </div>
      </div>

      <div
        v-else-if="!$apollo.queries.todos.loading && !todos.length && !filter"
        class="gl-flex gl-items-center gl-gap-5 gl-rounded-lg gl-p-4"
      >
        <img class="gl-h-11" aria-hidden="true" :src="$options.emptyTodosAllDoneSvg" />
        <span>
          <strong>{{ __('Good job!') }}</strong>
          {{ __('All your to-do items are done.') }}
        </span>
      </div>
      <div
        v-else-if="!$apollo.queries.todos.loading && !todos.length && filter"
        class="gl-flex gl-items-center gl-gap-5 gl-rounded-lg gl-p-4"
      >
        <img class="gl-h-11" aria-hidden="true" :src="$options.emptyTodosFilteredSvg" />
        <span>{{ __('Sorry, your filter produced no results') }}</span>
      </div>
      <ol v-else class="gl-m-0 gl-list-none gl-p-0">
        <todo-item
          v-for="todo in displayedTodos"
          :key="todo.id"
          class="-gl-mx-3 gl-rounded-lg gl-border-b-0 !gl-px-3 gl-py-4"
          :todo="todo"
          :tracking-additional="todoTrackingContext"
          @change="$apollo.queries.todos.refetch()"
        />
      </ol>

      <div class="gl-pt-3">
        <a :href="todosPath" @click="handleViewAllClick">{{ __('All to-do items') }}</a>
      </div>
    </template>
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
