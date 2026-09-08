<script>
import { GlButton, GlFormInput } from '@gitlab/ui';

import { updateHistory, setUrlParams } from '~/lib/utils/url_utility';
import { __, s__ } from '~/locale';
import FilteredSearchBar from '~/vue_shared/components/filtered_search_bar/filtered_search_bar_root.vue';
import updateLocalRoadmapSettingsMutation from '../queries/update_local_roadmap_settings.mutation.graphql';
import localRoadmapSettingsQuery from '../queries/local_roadmap_settings.query.graphql';

import EpicsFilteredSearchMixin from '../mixins/filtered_search_mixin';
import { mapLocalSettings } from '../utils/roadmap_utils';
import AnchoredRegexBuilder from 'ee/security_dashboard/components/shared/anchored_regex_builder.vue';

export default {
  name: 'RoadmapFilters',
  availableSortOptions: [
    {
      id: 1,
      title: __('Start date'),
      sortDirection: {
        descending: 'START_DATE_DESC',
        ascending: 'START_DATE_ASC',
      },
    },
    {
      id: 2,
      title: __('Due date'),
      sortDirection: {
        descending: 'END_DATE_DESC',
        ascending: 'END_DATE_ASC',
      },
    },
    {
      id: 3,
      title: __('Title'),
      sortDirection: {
        descending: 'TITLE_DESC',
        ascending: 'TITLE_ASC',
      },
    },
    {
      id: 4,
      title: __('Created date'),
      sortDirection: {
        descending: 'CREATED_AT_DESC',
        ascending: 'CREATED_AT_ASC',
      },
    },
    {
      id: 5,
      title: __('Last updated date'),
      sortDirection: {
        descending: 'UPDATED_AT_DESC',
        ascending: 'UPDATED_AT_ASC',
      },
    },
  ],
  components: {
    AnchoredRegexBuilder,
    GlButton,
    GlFormInput,
    FilteredSearchBar,
  },
  mixins: [EpicsFilteredSearchMixin],
  props: {
    localSearchSample: {
      type: String,
      required: false,
      default: '',
    },
    viewOnly: {
      type: Boolean,
      required: false,
      default: false,
    },
  },
  emits: ['local-search', 'toggle-settings'],
  data() {
    return {
      // eslint-disable-next-line vue/no-unused-properties -- localRoadmapSettings() is used by apollo query
      localRoadmapSettings: {},
      localSearchPattern: '',
      localSearchFlags: 'i',
      localSearchIsRegex: false,
    };
  },
  apollo: {
    localRoadmapSettings: {
      query: localRoadmapSettingsQuery,
    },
  },
  computed: {
    ...mapLocalSettings([
      'filterParams',
      'epicsState',
      'sortedBy',
      'timeframeRangeType',
      'isProgressTrackingActive',
      'progressTracking',
      'isShowingMilestones',
      'milestonesType',
      'isShowingLabels',
      'presetType',
    ]),
  },
  watch: {
    urlParams: {
      deep: true,
      immediate: true,
      handler(params) {
        if (Object.keys(params).length) {
          updateHistory({
            url: setUrlParams(params, {
              url: window.location.href,
              clearParams: true,
              decodeParams: true,
            }),
            title: document.title,
            replace: true,
          });
        }
      },
    },
  },
  methods: {
    setLocalSettings(settings) {
      this.$apollo.mutate({
        mutation: updateLocalRoadmapSettingsMutation,
        variables: {
          input: settings,
        },
      });
    },
    handleFilterEpics(filters, cleared) {
      if (filters.length || cleared) {
        this.setLocalSettings({ filterParams: this.getFilterParams(filters) });
      }
    },
    handleSortEpics(sortedBy) {
      this.setLocalSettings({ sortedBy });
    },
    updateLocalSearch(pattern) {
      this.localSearchPattern = pattern;
      this.localSearchFlags = 'i';
      this.localSearchIsRegex = false;
      this.emitLocalSearch();
    },
    applyLocalRegex({ pattern, flags }) {
      this.localSearchPattern = pattern;
      this.localSearchFlags = flags;
      this.localSearchIsRegex = true;
      this.emitLocalSearch();
    },
    emitLocalSearch() {
      this.$emit('local-search', {
        pattern: this.localSearchPattern,
        flags: this.localSearchFlags,
        regex: this.localSearchIsRegex,
      });
    },
  },
  i18n: {
    localSearch: s__('GroupRoadmap|Search the loaded roadmap'),
    regexBuilder: s__('GroupRoadmap|Build a roadmap search pattern'),
    settings: __('Settings'),
  },
};
</script>

<template>
  <div class="epics-filters epics-roadmap-filters epics-roadmap-filters-gl-ui gl-relative">
    <div
      class="epics-details-filters filtered-search-block row-content-block second-block m3-roadmap-filter-row gl-flex gl-flex-col gl-py-3 @sm/panel:gl-flex-row @sm/panel:gl-gap-3"
      :class="{ 'gl-justify-end': viewOnly }"
    >
      <filtered-search-bar
        v-if="!viewOnly"
        :namespace="groupFullPath"
        :tokens="getFilteredSearchTokens()"
        :sort-options="$options.availableSortOptions"
        :initial-filter-value="getFilteredSearchValue()"
        :initial-sort-by="sortedBy"
        sync-filter-and-sort
        terms-as-tokens
        recent-searches-storage-key="epics"
        class="gl-grow"
        @onFilter="handleFilterEpics"
        @onSort="handleSortEpics"
      />
      <div class="m3-roadmap-local-search">
        <gl-form-input
          class="m3-roadmap-local-input"
          :value="localSearchPattern"
          :aria-label="$options.i18n.localSearch"
          :placeholder="$options.i18n.localSearch"
          data-testid="roadmap-local-search"
          @input="updateLocalSearch"
        />
        <anchored-regex-builder
          :value="localSearchPattern"
          :sample="localSearchSample"
          :title="$options.i18n.regexBuilder"
          @apply="applyLocalRegex"
        />
      </div>
      <gl-button
        icon="settings"
        class="gl-mt-3 @sm/panel:gl-mt-0"
        :aria-label="$options.i18n.settings"
        data-testid="settings-button"
        @click="$emit('toggle-settings', $event)"
      >
        {{ $options.i18n.settings }}
      </gl-button>
    </div>
  </div>
</template>
