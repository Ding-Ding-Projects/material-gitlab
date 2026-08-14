<script>
import { __, s__ } from '~/locale';
import { InternalEvents } from '~/tracking';
import * as Sentry from '~/sentry/sentry_browser_wrapper';
import {
  createUserCountsManager,
  userCounts,
  useCachedUserCounts,
} from '~/super_sidebar/user_counts_manager';
import IndexLayout from '~/vue_shared/components/index_layout.vue';
import { fetchUserCounts } from '~/super_sidebar/user_counts_fetch';
import {
  EVENT_USER_FOLLOWS_LINK_ON_HOMEPAGE,
  TRACKING_LABEL_MERGE_REQUESTS,
  TRACKING_PROPERTY_REVIEW_REQUESTED,
  TRACKING_PROPERTY_ASSIGNED_TO_YOU,
  TRACKING_PROPERTY_AUTHORED_BY_YOU,
  TRACKING_LABEL_WORK_ITEMS,
} from '../tracking_constants';
import mergeRequestsWidgetMetadataQuery from '../graphql/queries/merge_requests_widget_metadata.query.graphql';
import workItemsWidgetMetadataQuery from '../graphql/queries/work_items_widget_metadata.query.graphql';
import GreetingHeader from './greeting_header.vue';
import UserItemsCountWidget from './user_items_count_widget.vue';
import ActivityWidget from './activity_widget.vue';
import QuickAccessWidget from './quick_access_widget.vue';
import TodosWidget from './todos_widget.vue';
import PickUpWidget from './pick_up_widget.vue';
import BaseWidget from './base_widget.vue';

export default {
  name: 'HomepageApp',
  components: {
    IndexLayout,
    GreetingHeader,
    ActivityWidget,
    TodosWidget,
    QuickAccessWidget,
    PickUpWidget,
    UserItemsCountWidget,
    BaseWidget,
  },
  mixins: [InternalEvents.mixin()],
  inject: ['duoCodeReviewBotUsername'],
  props: {
    reviewRequestedPath: {
      type: String,
      required: true,
    },
    assignedMergeRequestsPath: {
      type: String,
      required: true,
    },
    assignedWorkItemsPath: {
      type: String,
      required: true,
    },
    authoredWorkItemsPath: {
      type: String,
      required: true,
    },
    activityPath: {
      type: String,
      required: true,
    },
    lastPushEvent: {
      type: Object,
      required: false,
      default: null,
    },
  },
  data() {
    return {
      mergeRequestsMetadata: {},
      mergeRequestsHaveError: false,
      workItemsMetadata: {},
      workItemsHaveError: false,
    };
  },
  apollo: {
    mergeRequestsMetadata: {
      query: mergeRequestsWidgetMetadataQuery,
      variables() {
        return {
          duoCodeReviewBotUsername: this.duoCodeReviewBotUsername,
        };
      },
      update({ currentUser }) {
        return currentUser;
      },
      error(error) {
        this.mergeRequestsHaveError = true;
        Sentry.captureException(error);
      },
    },
    workItemsMetadata: {
      query: workItemsWidgetMetadataQuery,
      variables() {
        return { username: gon?.current_username || null };
      },
      update({ currentUser }) {
        return currentUser;
      },
      error(error) {
        this.workItemsHaveError = true;
        Sentry.captureException(error);
      },
    },
  },
  computed: {
    shouldShowPickUpWidget() {
      if (!this.lastPushEvent?.create_mr_path) return false;

      // Show widget if we have a push event and either backend says show OR we have valid data
      return Boolean(this.lastPushEvent.show_widget || this.lastPushEvent.branch_name);
    },
    reviewRequestedData() {
      return this.mergeRequestsMetadata?.reviewRequestedMergeRequests;
    },
    assignedMergeRequestsData() {
      return this.mergeRequestsMetadata?.assignedMergeRequests;
    },
    assignedWorkItemsData() {
      if (!this.workItemsMetadata.assigned) return null;
      const count = userCounts.assigned_issues ?? null;

      return {
        ...this.workItemsMetadata.assigned,
        count,
      };
    },
    authoredWorkItemsData() {
      return this.workItemsMetadata?.authored;
    },
  },
  created() {
    createUserCountsManager();

    if (userCounts.assigned_issues === null) {
      useCachedUserCounts();
      fetchUserCounts();
    }
  },
  methods: {
    handleReviewRequestedClick() {
      this.trackEvent(EVENT_USER_FOLLOWS_LINK_ON_HOMEPAGE, {
        label: TRACKING_LABEL_MERGE_REQUESTS,
        property: TRACKING_PROPERTY_REVIEW_REQUESTED,
      });
    },
    handleAssignedMergeRequestsClick() {
      this.trackEvent(EVENT_USER_FOLLOWS_LINK_ON_HOMEPAGE, {
        label: TRACKING_LABEL_MERGE_REQUESTS,
        property: TRACKING_PROPERTY_ASSIGNED_TO_YOU,
      });
    },
    handleAssignedWorkItemsClick() {
      this.trackEvent(EVENT_USER_FOLLOWS_LINK_ON_HOMEPAGE, {
        label: TRACKING_LABEL_WORK_ITEMS,
        property: TRACKING_PROPERTY_ASSIGNED_TO_YOU,
      });
    },
    handleAuthoredWorkItemsClick() {
      this.trackEvent(EVENT_USER_FOLLOWS_LINK_ON_HOMEPAGE, {
        label: TRACKING_LABEL_WORK_ITEMS,
        property: TRACKING_PROPERTY_AUTHORED_BY_YOU,
      });
    },
    reloadUserCounts() {
      this.mergeRequestsHaveError = false;
      this.workItemsHaveError = false;
      this.$apollo.queries.mergeRequestsMetadata.refetch();
      this.$apollo.queries.workItemsMetadata.refetch();
    },
    handleUserCountsVisible() {
      this.reloadUserCounts();
    },
  },
  i18n: {
    pageTitle: __('Home'),
    workspaceLabel: s__('HomePage|Your workspace'),
    workspaceDescription: s__('HomePage|A focused view of the work that needs your attention.'),
    quickAccessLabel: s__('HomePage|Quick access'),
    activityLabel: s__('HomePage|Activity'),
    mergeRequestsErrorText: s__(
      'HomePageMergeRequestsWidget|The number of merge requests is not available. Please refresh the page to try again, or visit the dashboard.',
    ),
    workItemsCardTitle: s__('HomePageWorkItemsWidget|Work items'),
    workItemsErrorText: s__(
      'HomePageWorkItemsWidget|The number of work items is not available. Please refresh the page to try again, or visit the work items list.',
    ),
  },
};
</script>

<template>
  <index-layout :page-heading-sr-only="true" :heading="$options.i18n.pageTitle">
    <main class="homepage-dashboard" data-testid="homepage-dashboard">
      <greeting-header />
      <div class="homepage-dashboard__intro" role="region" :aria-label="$options.i18n.workspaceLabel">
        <div>
          <p class="homepage-dashboard__eyebrow">{{ $options.i18n.workspaceLabel }}</p>
          <h1 class="homepage-dashboard__title">{{ $options.i18n.pageTitle }}</h1>
        </div>
        <p class="homepage-dashboard__description">
          {{ $options.i18n.workspaceDescription }}
        </p>
      </div>
      <div class="homepage-dashboard__layout">
        <section
          class="homepage-dashboard__primary gl-flex gl-flex-col gl-gap-6 @md/panel:gl-col-span-2"
          :aria-label="$options.i18n.workspaceLabel"
        >
          <base-widget
            class="gl-grid gl-grid-cols-2 gl-gap-5 @lg/panel:gl-grid-cols-4"
            :apply-default-styling="false"
            @visible="handleUserCountsVisible"
          >
            <user-items-count-widget
              data-testid="review-requested-widget"
              :has-error="mergeRequestsHaveError"
              :error-text="$options.i18n.mergeRequestsErrorText"
              :card-text="s__('HomePageMergeRequestsWidget|Merge requests')"
              :link-text="s__('HomePageMergeRequestsWidget|Waiting for your review')"
              :path="reviewRequestedPath"
              :user-items="reviewRequestedData"
              :icon-name="'merge-request'"
              @click-link="handleReviewRequestedClick"
            />
            <user-items-count-widget
              data-testid="assigned-merge-requests-widget"
              :has-error="mergeRequestsHaveError"
              :error-text="$options.i18n.mergeRequestsErrorText"
              :card-text="s__('HomePageMergeRequestsWidget|Merge requests')"
              :link-text="s__('HomePageMergeRequestsWidget|Assigned to you')"
              :path="assignedMergeRequestsPath"
              :user-items="assignedMergeRequestsData"
              :icon-name="'merge-request'"
              @click-link="handleAssignedMergeRequestsClick"
            />
            <user-items-count-widget
              data-testid="assigned-work-items-widget"
              :has-error="workItemsHaveError"
              :error-text="$options.i18n.workItemsErrorText"
              :card-text="$options.i18n.workItemsCardTitle"
              :link-text="s__('HomePageWorkItemsWidget|Assigned to you')"
              :path="assignedWorkItemsPath"
              :user-items="assignedWorkItemsData"
              icon-name="work-items"
              @click-link="handleAssignedWorkItemsClick"
            />
            <user-items-count-widget
              data-testid="authored-work-items-widget"
              :has-error="workItemsHaveError"
              :error-text="$options.i18n.workItemsErrorText"
              :card-text="$options.i18n.workItemsCardTitle"
              :link-text="s__('HomePageWorkItemsWidget|Authored by you')"
              :path="authoredWorkItemsPath"
              :user-items="authoredWorkItemsData"
              icon-name="work-items"
              @click-link="handleAuthoredWorkItemsClick"
            />
          </base-widget>
          <pick-up-widget v-if="shouldShowPickUpWidget" :last-push-event="lastPushEvent" />
          <todos-widget />
          <h2 class="homepage-dashboard__section-title homepage-dashboard__activity-title">
            {{ $options.i18n.activityLabel }}
          </h2>
          <activity-widget :activity-path="activityPath" />
        </section>
        <aside
          class="homepage-dashboard__aside gl-flex gl-flex-col gl-gap-6"
          :aria-label="$options.i18n.quickAccessLabel"
        >
          <h2 class="homepage-dashboard__section-title">{{ $options.i18n.quickAccessLabel }}</h2>
          <quick-access-widget />
        </aside>
      </div>
    </main>
  </index-layout>
</template>

<style lang="scss" scoped>
.homepage-dashboard {
  --homepage-dashboard-surface: var(--gl-color-surface-container-low, var(--gl-color-neutral-50));
  --homepage-dashboard-outline: var(--gl-color-border-subtle, var(--gl-color-neutral-200));

  &__intro {
    display: flex;
    align-items: flex-end;
    justify-content: space-between;
    gap: var(--gl-spacing-scale-6, 24px);
    margin-bottom: var(--gl-spacing-scale-6, 24px);
    padding: var(--gl-spacing-scale-6, 24px);
    border: 1px solid var(--homepage-dashboard-outline);
    border-radius: var(--gl-border-radius-lg, 16px);
    background: var(--homepage-dashboard-surface);
  }

  &__eyebrow {
    margin: 0 0 var(--gl-spacing-scale-2, 8px);
    color: var(--gl-color-text-subtle);
    font-size: var(--gl-font-size-sm, 12px);
    font-weight: 600;
    letter-spacing: 0.04em;
    text-transform: uppercase;
  }

  &__title {
    margin: 0;
    color: var(--gl-color-text-default);
    font-size: var(--gl-font-size-4xl, 32px);
    font-weight: 600;
    letter-spacing: -0.02em;
  }

  &__description {
    max-width: 32rem;
    margin: 0;
    color: var(--gl-color-text-subtle);
    font-size: var(--gl-font-size-md, 16px);
    line-height: 1.5;
  }

  &__layout {
    display: grid;
    grid-template-columns: minmax(0, 2fr) minmax(16rem, 1fr);
    gap: var(--gl-spacing-scale-6, 24px);
  }

  &__section-title {
    margin: 0 0 calc(var(--gl-spacing-scale-3, 12px) * -1);
    color: var(--gl-color-text-default);
    font-size: var(--gl-font-size-lg, 18px);
    font-weight: 600;
  }

  &__activity-title {
    margin-top: var(--gl-spacing-scale-6, 24px);
  }

  @media (max-width: 768px) {
    &__intro {
      align-items: flex-start;
      flex-direction: column;
    }

    &__layout {
      grid-template-columns: minmax(0, 1fr);
    }
  }
}
</style>
