<template>
  <div class="gl-mds-admin-filterbar">
    <SearchField
      class="gl-mds-admin-filterbar__search"
      :value="value"
      :regex-mode="regexMode"
      :placeholder="`Filter ${label.toLowerCase()}…`"
      :aria-label="`Filter ${label.toLowerCase()}`"
      icon="filter"
      compact
      :corpus="corpus"
      @input="$emit('input', $event)"
      @update:regex-mode="$emit('update:regex-mode', $event)"
    />
    <span class="gl-mds-admin-filterbar__count" role="status">{{ countLabel }}</span>
  </div>
</template>

<script>
import SearchField from './SearchField.vue';

export default {
  name: 'ListFilterBar',
  components: { SearchField },
  props: {
    value: { type: String, default: '' },
    regexMode: { type: Boolean, default: false },
    label: { type: String, required: true },
    corpus: { type: Array, default: () => [] },
    resultCount: { type: Number, required: true },
  },
  computed: {
    countLabel() {
      return `${this.resultCount} ${this.resultCount === 1 ? 'result' : 'results'}`;
    },
  },
};
</script>
