<script>
import { nextTick } from 'vue';
import { GlFilteredSearch, GlFormInput } from '@gitlab/ui';
import { isEqual } from 'lodash-es';
import { OPERATOR_NOT } from '~/vue_shared/components/filtered_search_bar/constants';
import { s__ } from '~/locale';
import AnchoredRegexBuilder from '../anchored_regex_builder.vue';
import { ALL_ID } from './constants';

export default {
  name: 'FilteredSearch',
  components: {
    AnchoredRegexBuilder,
    GlFilteredSearch,
    GlFormInput,
  },
  inject: {
    defaultBranchContext: {
      default: () => null,
    },
    dashboardType: {
      default: '',
    },
  },
  props: {
    tokens: {
      type: Array,
      required: true,
    },
  },
  emits: ['filters-changed', 'url-params-changed'],
  data() {
    return {
      tokenSearch: '',
      tokenSearchFlags: 'i',
      tokenSearchIsRegex: false,
      value: [],
    };
  },
  computed: {
    tokenSearchSample() {
      return this.tokens
        .map(({ title, type }) => title || type)
        .filter(Boolean)
        .join('\n');
    },
    visibleTokens() {
      if (!this.tokenSearch) return this.tokens;

      const source = this.tokenSearchIsRegex
        ? this.tokenSearch
        : this.tokenSearch.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

      try {
        const expression = new RegExp(source, this.tokenSearchFlags.replace(/[gy]/g, ''));
        return this.tokens.filter(({ title, type }) => expression.test(title || type));
      } catch {
        return this.tokens;
      }
    },
    filteredValue() {
      return this.value.filter(({ type }) => this.tokens.some((token) => token.type === type));
    },
    context() {
      return {
        defaultBranchContext: this.defaultBranchContext,
        dashboardType: this.dashboardType,
      };
    },
  },
  created() {
    this.value = this.tokens.map(this.buildInitialValue).filter(({ value }) => value.data?.length);

    this.updateUrlParams();
    this.emitFilters();
  },
  methods: {
    updateTokenSearch(value) {
      this.tokenSearch = value;
      this.tokenSearchFlags = 'i';
      this.tokenSearchIsRegex = false;
    },
    applyTokenRegex({ pattern, flags }) {
      this.tokenSearch = pattern;
      this.tokenSearchFlags = flags;
      this.tokenSearchIsRegex = true;
    },
    buildInitialValue(token) {
      const params = new URLSearchParams(window.location.search);
      const parse = (key) => params.get(key)?.split(',').filter(Boolean);

      const includeValues = parse(token.type);
      const excludeValues = parse(`not[${token.type}]`);

      let urlValues;
      if (includeValues) {
        urlValues = includeValues;
      } else if (excludeValues) {
        urlValues = excludeValues;
      }

      let data;
      if (urlValues) {
        data = token.token?.parseQueryParams?.(urlValues, token) ?? urlValues;
      } else {
        data = this.getDefaultValues(token);
      }

      return {
        type: token.type,
        value: {
          data,
          operator: excludeValues && !includeValues ? OPERATOR_NOT : token.operators[0].value,
        },
      };
    },
    getDefaultValues(tokenDef) {
      return tokenDef.token?.defaultValues?.({ ...this.context, config: tokenDef }) ?? [];
    },
    getSelectedValue(type) {
      const token = this.value.find((t) => t.type === type);
      return token?.value || {};
    },
    getTokenDefinition(type) {
      return this.tokens.find((token) => token.type === type);
    },
    getTokenComponent(type) {
      return this.getTokenDefinition(type)?.token;
    },
    transformFilters(type, { data, operator }, filters) {
      const token = this.getTokenComponent(type);
      if (token?.transformFilters) {
        return token.transformFilters(data, { filters, operator, ...this.context });
      }
      return {
        [type]: Array.isArray(data) ? data.filter((i) => i !== ALL_ID) : data,
      };
    },
    transformQueryParams(type, data = []) {
      const tokenDef = this.getTokenDefinition(type);
      const component = tokenDef?.token;
      if (isEqual(data, this.getDefaultValues(tokenDef))) return undefined;

      if (component?.transformQueryParams) {
        return component.transformQueryParams(data, tokenDef);
      }
      return Array.isArray(data) ? data.join(',') : data;
    },
    emitFilters() {
      const filters = {};
      for (const { type, value } of this.filteredValue) {
        Object.assign(filters, this.transformFilters(type, value, filters));
      }

      this.$emit('filters-changed', filters);
    },
    updateUrlParams() {
      const params = {};

      for (const { type } of this.tokens) {
        const { data, operator } = this.getSelectedValue(type);
        const value = this.transformQueryParams(type, data);

        params[type] = undefined;
        params[`not[${type}]`] = undefined;

        // "!=" uses the negation key (e.g. "not[severity]"), everything else
        // uses the standard key (e.g. "severity").
        if (operator === OPERATOR_NOT) {
          params[`not[${type}]`] = value;
        } else {
          params[type] = value;
        }
      }

      this.$emit('url-params-changed', params);
    },
    async update() {
      // Two nextTicks are needed because in Vue 3 compat mode, v-model updates
      // propagate asynchronously and a single nextTick is not sufficient for
      // this.value to reflect the latest state after token-complete/token-destroy events.
      await nextTick();
      await nextTick();
      this.updateUrlParams();
      this.emitFilters();
    },
  },
};
</script>
<template>
  <div class="m3-security-search-stack">
    <div class="m3-security-token-search">
      <gl-form-input
        class="m3-security-token-input"
        :value="tokenSearch"
        :placeholder="s__('SecurityReports|Find a security filter')"
        :aria-label="s__('SecurityReports|Find a security filter')"
        data-testid="security-token-search"
        @input="updateTokenSearch"
      />
      <anchored-regex-builder
        :value="tokenSearch"
        :sample="tokenSearchSample"
        :title="s__('SecurityReports|Build a security-filter search pattern')"
        @apply="applyTokenRegex"
      />
    </div>
    <gl-filtered-search
      v-model="value"
      :placeholder="s__('SecurityReports|Filter results...')"
      :available-tokens="visibleTokens"
      @token-complete="update"
      @token-destroy="update"
      @clear="update"
    />
  </div>
</template>
