<template>
  <header class="secure-topbar" data-screen-label="Top bar">
    <form class="secure-topbar__search" role="search" :aria-label="`Search ${tabLabel}`" @submit.prevent>
      <span class="secure-topbar__search-icon"><secure-icon name="search" /></span>
      <label :for="searchInputId" class="secure-visually-hidden">{{ `Search ${tabLabel}` }}</label>
      <input
        :id="searchInputId"
        ref="searchInput"
        class="secure-topbar__search-input"
        type="text"
        :value="search"
        :placeholder="placeholder"
        autocomplete="off"
        @input="$emit('update:search', $event.target.value)"
      />
      <button
        type="button"
        class="secure-topbar__regex-toggle"
        :class="{ 'secure-topbar__regex-toggle--active': regexMode }"
        :aria-pressed="regexMode"
        aria-label="Toggle regular expression search mode"
        title="Regex mode"
        @click="$emit('toggle-regex-mode')"
      >
        .*
      </button>
      <button
        ref="builderTrigger"
        type="button"
        class="secure-topbar__icon-btn"
        :class="{ 'secure-topbar__icon-btn--active': regexBuilderOpen }"
        aria-haspopup="dialog"
        :aria-expanded="regexBuilderOpen"
        aria-label="Open regex builder"
        title="Regex builder"
        @click="onToggleBuilder"
      >
        <secure-icon name="tune" :size="18" />
      </button>
      <secure-regex-builder
        v-if="regexBuilderOpen"
        :initial="regexInitial"
        :corpus="regexCorpus"
        @apply="onApplyRegex"
        @close="onCloseBuilder"
      />
    </form>
    <button
      type="button"
      class="secure-topbar__icon-btn secure-topbar__icon-btn--large"
      aria-haspopup="dialog"
      aria-label="Open command palette (Control+Shift+F)"
      title="Command palette (Ctrl+Shift+F)"
      @click="$emit('open-palette')"
    >
      <secure-icon name="command" />
    </button>
    <button
      type="button"
      class="secure-topbar__icon-btn secure-topbar__icon-btn--large"
      :aria-pressed="isDark"
      :aria-label="isDark ? 'Switch to light theme' : 'Switch to dark theme'"
      :title="isDark ? 'Switch to light theme' : 'Switch to dark theme'"
      @click="$emit('toggle-theme')"
    >
      <secure-icon :name="isDark ? 'sun' : 'moon'" />
    </button>
    <div class="secure-topbar__avatar" aria-hidden="true">JD</div>
  </header>
</template>

<script>
import { uniqueId } from 'lodash';
import SecureIcon from './SecureIcon.vue';
import SecureRegexBuilder from './SecureRegexBuilder.vue';

export default {
  name: 'SecureTopBar',
  components: { SecureIcon, SecureRegexBuilder },
  props: {
    search: { type: String, default: '' },
    tabLabel: { type: String, required: true },
    regexMode: { type: Boolean, default: false },
    regexBuilderOpen: { type: Boolean, default: false },
    regexInitial: { type: String, default: '' },
    regexCorpus: { type: Array, default: () => [] },
    isDark: { type: Boolean, default: false },
  },
  data() {
    return { searchInputId: uniqueId('secure-search-input-') };
  },
  computed: {
    placeholder() {
      const scope = this.tabLabel.toLowerCase();
      return this.regexMode ? `Regex search — ${scope}` : `Search ${scope}`;
    },
  },
  methods: {
    onToggleBuilder() {
      this.$emit(this.regexBuilderOpen ? 'close-regex-builder' : 'open-regex-builder');
    },
    onCloseBuilder() {
      this.$emit('close-regex-builder');
      this.$nextTick(() => this.$refs.builderTrigger && this.$refs.builderTrigger.focus());
    },
    onApplyRegex(pattern) {
      this.$emit('apply-regex', pattern);
      this.$nextTick(() => this.$refs.searchInput && this.$refs.searchInput.focus());
    },
  },
};
</script>
