<script>
import MdIcon from './MdIcon.vue';

export default {
  name: 'TodosTopBar',
  components: { MdIcon },
  props: {
    search: {
      type: String,
      default: '',
    },
    regexMode: {
      type: Boolean,
      default: false,
    },
    regexValid: {
      type: Boolean,
      default: true,
    },
    isDark: {
      type: Boolean,
      default: false,
    },
  },
  computed: {
    placeholder() {
      return this.regexMode ? 'Regex search — to-dos' : 'Search to-dos';
    },
  },
};
</script>

<template>
  <header class="md-todos__topbar" data-screen-label="Top bar">
    <div class="md-todos__search" role="search">
      <md-icon name="search" class="md-todos__search-icon" />
      <label class="md-todos__visually-hidden" for="todos-search-input">{{ placeholder }}</label>
      <input
        id="todos-search-input"
        class="md-todos__search-input"
        type="search"
        :value="search"
        :placeholder="placeholder"
        :aria-invalid="regexMode && !regexValid"
        aria-describedby="todos-search-hint"
        @input="$emit('update:search', $event.target.value)"
      />
      <span id="todos-search-hint" class="md-todos__visually-hidden">
        Plain text search by default. Toggle regex mode or open the regex builder for pattern matching.
      </span>
      <button
        type="button"
        class="md-todos__regex-chip"
        :class="{ 'md-todos__regex-chip--active': regexMode }"
        :aria-pressed="regexMode"
        title="Regex mode"
        @click="$emit('toggle-regex-mode')"
      >
        .*
      </button>
      <button
        type="button"
        class="md-todos__icon-button"
        title="Regex builder"
        aria-label="Open regex builder for the to-do search"
        @click="$emit('open-regex-builder')"
      >
        <md-icon name="construction" :size="18" />
      </button>
    </div>

    <button
      type="button"
      class="md-todos__icon-button"
      title="Command palette (Ctrl+Shift+F)"
      aria-label="Open command palette"
      @click="$emit('open-palette')"
    >
      <md-icon name="keyboard_command_key" />
    </button>

    <button
      type="button"
      class="md-todos__icon-button"
      title="Toggle theme"
      :aria-label="isDark ? 'Switch to light theme' : 'Switch to dark theme'"
      @click="$emit('toggle-theme')"
    >
      <md-icon :name="isDark ? 'light_mode' : 'dark_mode'" />
    </button>

    <div class="md-todos__avatar" title="Signed-in user" aria-hidden="true">JD</div>
  </header>
</template>
