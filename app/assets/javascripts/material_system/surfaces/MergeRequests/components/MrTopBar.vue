<template>
  <header class="mr-topbar" aria-label="Merge requests toolbar">
    <div class="mr-topbar__search">
      <span class="material-symbols-outlined mr-topbar__search-icon" aria-hidden="true">search</span>
      <label :for="searchInputId" class="mr-sr-only">{{ searchPlaceholder }}</label>
      <input
        :id="searchInputId"
        :value="search"
        type="text"
        class="mr-topbar__search-input"
        :placeholder="searchPlaceholder"
        @input="$emit('update:search', $event.target.value)"
      />
      <button
        type="button"
        class="mr-topbar__regex-toggle"
        :data-active="regexMode"
        :aria-pressed="regexMode ? 'true' : 'false'"
        title="Regex mode"
        @click="$emit('toggle-regex-mode')"
      >
        .*
      </button>
      <button
        ref="regexBuilderBtn"
        type="button"
        class="mr-icon-btn"
        title="Regex builder"
        aria-haspopup="true"
        :aria-expanded="regexPopoverOpen ? 'true' : 'false'"
        @click="$emit(regexPopoverOpen ? 'close-regex-builder' : 'open-regex-builder')"
      >
        <span class="material-symbols-outlined" aria-hidden="true" style="font-size: 18px">construction</span>
      </button>
      <mr-regex-popover
        v-if="regexPopoverOpen"
        :initial-pattern="regexMode ? search : ''"
        :corpus="corpus"
        :trigger-el="$refs.regexBuilderBtn"
        corpus-title="Matches in merge requests"
        @apply="$emit('apply-regex', $event)"
        @close="$emit('close-regex-builder')"
      />
    </div>
    <button
      type="button"
      class="mr-icon-btn mr-icon-btn--lg"
      title="Command palette (Ctrl+Shift+F)"
      @click="$emit('open-palette')"
    >
      <span class="material-symbols-outlined" aria-hidden="true">keyboard_command_key</span>
    </button>
    <button type="button" class="mr-icon-btn mr-icon-btn--lg" title="Toggle theme" @click="$emit('toggle-theme')">
      <span class="material-symbols-outlined" aria-hidden="true">{{ dark ? 'light_mode' : 'dark_mode' }}</span>
    </button>
    <div class="mr-topbar__avatar" :title="avatarLabel" aria-hidden="true">{{ avatarInitials }}</div>
    <span class="mr-sr-only">{{ avatarLabel }}</span>
  </header>
</template>

<script>
import MrRegexPopover from './MrRegexPopover.vue';

export default {
  name: 'MrTopBar',
  components: { MrRegexPopover },
  props: {
    search: { type: String, required: true },
    regexMode: { type: Boolean, required: true },
    regexPopoverOpen: { type: Boolean, required: true },
    dark: { type: Boolean, required: true },
    corpus: { type: Array, default: () => [] },
    avatarInitials: { type: String, required: true },
    avatarLabel: { type: String, required: true },
  },
  computed: {
    searchInputId() {
      return 'mr-topbar-search';
    },
    searchPlaceholder() {
      return this.regexMode ? 'Regex search — title, branch, id' : 'Search merge requests';
    },
  },
};
</script>
