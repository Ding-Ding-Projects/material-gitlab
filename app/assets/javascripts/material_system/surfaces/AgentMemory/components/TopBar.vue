<template>
  <header class="am-topbar" data-screen-label="Top bar">
    <div ref="searchBar" class="am-search-bar">
      <MaterialIcon name="search" :size="20" class="am-search-bar__icon" />
      <label for="am-search-input" class="am-visually-hidden">
        {{ regexMode ? 'Regex search across memory inventory' : 'Search memory, skills, sessions' }}
      </label>
      <input
        id="am-search-input"
        ref="searchInput"
        type="text"
        class="am-search-bar__input"
        :value="search"
        :placeholder="placeholder"
        @input="$emit('update:search', $event.target.value)"
      />
      <button
        type="button"
        class="am-regex-mode-pill"
        :class="{ 'am-regex-mode-pill--active': regexMode }"
        :aria-pressed="regexMode ? 'true' : 'false'"
        title="Toggle regex mode"
        @click="$emit('toggle-regex-mode')"
      >
        .*
      </button>
      <button
        type="button"
        class="am-icon-btn"
        title="Regex builder"
        aria-haspopup="dialog"
        :aria-expanded="regexOpen ? 'true' : 'false'"
        @click="openBuilder"
      >
        <MaterialIcon name="tune" :size="18" />
      </button>
    </div>

    <button
      type="button"
      class="am-icon-btn"
      title="Command palette (Ctrl+Shift+F)"
      @click="$emit('open-palette')"
    >
      <MaterialIcon name="command" :size="20" />
    </button>
    <button
      type="button"
      class="am-icon-btn"
      :title="dark ? 'Switch to light theme' : 'Switch to dark theme'"
      @click="$emit('toggle-theme')"
    >
      <MaterialIcon :name="dark ? 'sun' : 'moon'" :size="20" />
    </button>
    <div class="am-avatar" title="Signed in as JD" aria-hidden="true">JD</div>

    <RegexBuilderPopover
      :open="regexOpen"
      :anchor="anchorRect"
      :initial-pattern="regexMode ? search : ''"
      :corpus="corpus"
      corpus-title="matches in memory"
      @apply="onApplyRegex"
      @close="closeBuilder"
    />
  </header>
</template>

<script>
import MaterialIcon from './MaterialIcon.vue';
import RegexBuilderPopover from './RegexBuilderPopover.vue';

export default {
  name: 'TopBar',
  components: { MaterialIcon, RegexBuilderPopover },
  props: {
    search: {
      type: String,
      required: true,
    },
    regexMode: {
      type: Boolean,
      required: true,
    },
    corpus: {
      type: Array,
      default: () => [],
    },
    dark: {
      type: Boolean,
      required: true,
    },
  },
  data() {
    return {
      regexOpen: false,
      anchorRect: null,
    };
  },
  computed: {
    placeholder() {
      return this.regexMode ? 'Regex search — memory inventory' : 'Search memory, skills, sessions';
    },
  },
  methods: {
    openBuilder() {
      const rect = this.$refs.searchBar.getBoundingClientRect();
      this.anchorRect = { top: rect.top, left: rect.left, bottom: rect.bottom, width: rect.width };
      this.regexOpen = true;
    },
    closeBuilder() {
      this.regexOpen = false;
    },
    onApplyRegex({ pattern, flags }) {
      this.$emit('update:search', pattern);
      this.$emit('apply-regex', { pattern, flags });
      this.regexOpen = false;
    },
    focusSearch() {
      if (this.$refs.searchInput) this.$refs.searchInput.focus();
    },
  },
};
</script>
