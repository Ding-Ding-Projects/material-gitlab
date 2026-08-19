<script>
import MaterialIcon from './icons/MaterialIcon.vue';
import RegexBuilderPopover from './RegexBuilderPopover.vue';

/**
 * Top bar: search field with inline regex-mode toggle and anchored regex
 * builder, command palette trigger, theme toggle, and account avatar. Ported
 * from the design's `<header data-screen-label="Top bar">` block.
 */
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
    regexOpen: {
      type: Boolean,
      required: true,
    },
    regexCorpus: {
      type: Array,
      required: true,
    },
    dark: {
      type: Boolean,
      required: true,
    },
    avatarInitials: {
      type: String,
      required: false,
      default: 'JD',
    },
  },
  computed: {
    placeholder() {
      return this.regexMode ? 'Regex search — title, location, CVE' : 'Search vulnerabilities';
    },
    themeIcon() {
      return this.dark ? 'lightMode' : 'darkMode';
    },
    themeLabel() {
      return this.dark ? 'Switch to light theme' : 'Switch to dark theme';
    },
  },
};
</script>

<template>
  <header class="sec-topbar" aria-label="Security dashboard top bar">
    <div class="sec-search" :class="{ 'sec-search--regex': regexOpen }">
      <material-icon name="search" />
      <input
        class="sec-search__input"
        type="text"
        :value="search"
        :placeholder="placeholder"
        aria-label="Search vulnerabilities"
        autocomplete="off"
        @input="$emit('update-search', $event.target.value)"
      />
      <button
        type="button"
        class="sec-search__regex-chip"
        :class="{ 'sec-search__regex-chip--active': regexMode }"
        title="Toggle regex mode"
        aria-label="Toggle regex search mode"
        :aria-pressed="regexMode"
        @click="$emit('toggle-regex-mode')"
      >
        .*
      </button>
      <button
        type="button"
        class="sec-icon-button"
        title="Regex builder"
        aria-label="Open regex builder"
        aria-haspopup="dialog"
        :aria-expanded="regexOpen"
        @click="$emit('open-regex-builder')"
      >
        <material-icon name="tune" :size="18" />
      </button>
      <regex-builder-popover
        v-if="regexOpen"
        :initial-pattern="regexMode ? search : ''"
        :corpus="regexCorpus"
        corpus-title="Matches in vulnerabilities"
        @apply="$emit('apply-regex', $event)"
        @close="$emit('close-regex-builder')"
      />
    </div>
    <button
      type="button"
      class="sec-icon-button sec-icon-button--lg"
      title="Command palette (Ctrl+Shift+F)"
      aria-label="Open command palette"
      @click="$emit('open-palette')"
    >
      <material-icon name="command" />
    </button>
    <button
      type="button"
      class="sec-icon-button sec-icon-button--lg"
      :title="themeLabel"
      :aria-label="themeLabel"
      :aria-pressed="dark"
      @click="$emit('toggle-theme')"
    >
      <material-icon :name="themeIcon" />
    </button>
    <div class="sec-avatar" aria-hidden="true">{{ avatarInitials }}</div>
  </header>
</template>
