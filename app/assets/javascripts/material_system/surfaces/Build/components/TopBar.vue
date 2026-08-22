<template>
  <header class="build-topbar" data-screen-label="Top bar">
    <search-field
      :value="search"
      @update:value="$emit('update:search', $event)"
      :regex-mode="regexMode"
      @update:regex-mode="$emit('update:regex-mode', $event)"
      :placeholder="searchPlaceholder"
      :label="searchLabel"
      :corpus="corpus"
      class="build-topbar__search"
    />
    <button type="button" class="icon-btn" title="Command palette (Ctrl+Shift+F)" @click="$emit('open-palette')">
      <icon name="command" />
    </button>
    <button type="button" class="icon-btn" :title="isDark ? 'Switch to light theme' : 'Switch to dark theme'" @click="$emit('toggle-theme')">
      <icon :name="isDark ? 'light_mode' : 'dark_mode'" />
    </button>
    <div class="build-topbar__avatar" aria-hidden="true">{{ avatarInitials }}</div>
  </header>
</template>

<script>
import Icon from './Icon.vue';
import SearchField from './SearchField.vue';

export default {
  name: 'BuildTopBar',
  components: { Icon, SearchField },
  props: {
    search: { type: String, default: '' },
    regexMode: { type: Boolean, default: false },
    searchPlaceholder: { type: String, required: true },
    searchLabel: { type: String, required: true },
    corpus: { type: Array, default: () => [] },
    isDark: { type: Boolean, default: false },
    avatarInitials: { type: String, default: '' },
  },
};
</script>
