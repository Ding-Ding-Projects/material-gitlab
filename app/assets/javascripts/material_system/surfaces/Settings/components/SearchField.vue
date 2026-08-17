<template>
  <div class="st-search-wrap">
    <div class="st-search" :class="{ 'st-search--invalid': regexMode && !valid }">
      <StIcon name="search" class="st-search__icon" />
      <label :for="inputId" class="st-visually-hidden">{{ label }}</label>
      <input
        :id="inputId"
        ref="input"
        type="text"
        class="st-search__input"
        :value="value"
        :placeholder="placeholder"
        :aria-invalid="regexMode && !valid"
        :aria-describedby="regexMode && !valid ? `${inputId}-error` : null"
        @input="$emit('input', $event.target.value)"
      />
      <button
        type="button"
        class="st-search__pill"
        :class="{ 'st-search__pill--active': regexMode }"
        :aria-pressed="regexMode"
        title="Toggle regex mode for this search"
        @click="$emit('toggle-regex')"
      >
        .*
      </button>
      <button
        type="button"
        class="st-search__icon-btn"
        title="Regex builder"
        aria-haspopup="dialog"
        :aria-expanded="regexOpen"
        @click="$emit('toggle-builder')"
      >
        <StIcon name="wrench" size="small" />
      </button>
      <RegexBuilderPopover
        v-if="regexOpen"
        :initial-pattern="regexMode ? value : ''"
        :corpus="corpus"
        :corpus-title="corpusTitle"
        @apply="$emit('apply-regex', $event)"
        @close="$emit('toggle-builder')"
      />
    </div>
    <p v-if="regexMode && !valid" :id="`${inputId}-error`" class="st-search__error" role="status">
      Invalid pattern{{ error ? `: ${error}` : '' }} — showing all results.
    </p>
  </div>
</template>

<script>
import StIcon from './StIcon.vue';
import RegexBuilderPopover from './RegexBuilderPopover.vue';

export default {
  name: 'SearchField',
  components: { StIcon, RegexBuilderPopover },
  props: {
    value: { type: String, default: '' },
    placeholder: { type: String, default: 'Search' },
    label: { type: String, default: 'Search' },
    regexMode: { type: Boolean, default: false },
    regexOpen: { type: Boolean, default: false },
    valid: { type: Boolean, default: true },
    error: { type: String, default: '' },
    corpus: { type: Array, default: () => [] },
    corpusTitle: { type: String, default: 'Matches' },
  },
  data() {
    return { inputId: `st-search-${Math.random().toString(36).slice(2, 9)}` };
  },
  methods: {
    focus() {
      this.$refs.input && this.$refs.input.focus();
    },
  },
};
</script>

<style lang="scss" scoped>
.st-search-wrap {
  position: relative;
  width: 100%;
}

.st-search {
  display: flex;
  align-items: center;
  gap: 10px;
  background: var(--st-surfc);
  border-radius: var(--st-radius-pill);
  padding: 8px 8px 8px 18px;
  color: var(--st-onsurfv);
  border: 1px solid transparent;

  &--invalid {
    border-color: var(--st-err);
  }

  &:focus-within {
    outline: 2px solid var(--st-prim);
    outline-offset: 1px;
  }
}

.st-search__icon {
  color: var(--st-onsurfv);
}

.st-search__input {
  border: none;
  outline: none;
  background: transparent;
  font: inherit;
  color: var(--st-onsurf);
  flex: 1;
  min-width: 0;
}

.st-search__pill {
  padding: 5px 10px;
  border-radius: var(--st-radius-pill);
  font-size: 12px;
  font-weight: 700;
  font-family: 'SFMono-Regular', Consolas, Menlo, monospace;
  cursor: pointer;
  border: none;
  background: var(--st-surfch);
  color: var(--st-onsurfv);

  &--active {
    background: var(--st-prim);
    color: var(--st-onprim);
  }

  &:focus-visible {
    outline: 2px solid var(--st-prim);
    outline-offset: 2px;
  }
}

.st-search__icon-btn {
  width: 32px;
  height: 32px;
  border-radius: var(--st-radius-pill);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  border: none;
  background: transparent;
  color: var(--st-onsurfv);

  &:hover {
    background: var(--st-surfch);
  }

  &:focus-visible {
    outline: 2px solid var(--st-prim);
    outline-offset: 2px;
  }
}

.st-search__error {
  margin: 4px 0 0 18px;
  font-size: 12px;
  color: var(--st-err);
}
</style>
