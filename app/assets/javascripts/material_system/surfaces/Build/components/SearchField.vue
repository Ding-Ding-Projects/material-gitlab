<template>
  <div class="search-field">
    <icon name="search" class="search-field__icon" />
    <input
      :id="inputId"
      type="text"
      class="search-field__input"
      :value="value"
      :placeholder="placeholder"
      :aria-label="label"
      @input="$emit('update:value', $event.target.value)"
    />
    <button
      type="button"
      class="search-field__chip"
      :class="{ 'search-field__chip--on': regexMode }"
      :aria-pressed="regexMode"
      title="Match search as a regular expression"
      @click="$emit('update:regex-mode', !regexMode)"
    >.*</button>
    <button
      type="button"
      class="search-field__builder"
      aria-haspopup="dialog"
      title="Open the regex builder"
      @click="builderOpen = true"
    >
      <icon name="construction" />
    </button>
    <regex-builder-overlay
      v-if="builderOpen"
      :initial-pattern="value"
      :corpus="corpus"
      corpus-title="Matches"
      @apply="onApply"
      @close="builderOpen = false"
    />
  </div>
</template>

<script>
import Icon from './Icon.vue';
import RegexBuilderOverlay from './RegexBuilderOverlay.vue';

let uid = 0;

export default {
  name: 'BuildSearchField',
  components: { Icon, RegexBuilderOverlay },
  props: {
    value: { type: String, default: '' },
    regexMode: { type: Boolean, default: false },
    placeholder: { type: String, default: 'Search' },
    label: { type: String, required: true },
    corpus: { type: Array, default: () => [] },
  },
  data() {
    return {
      inputId: `build-search-${(uid += 1)}`,
      builderOpen: false,
    };
  },
  methods: {
    onApply(pattern) {
      this.$emit('update:value', pattern);
      this.$emit('update:regex-mode', true);
      this.builderOpen = false;
    },
  },
};
</script>
