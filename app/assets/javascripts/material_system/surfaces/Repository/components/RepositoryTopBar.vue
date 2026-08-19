<script>
import MIcon from './MIcon.vue';

export default {
  name: 'RepositoryTopBar',
  components: { MIcon },
  props: {
    search: { type: String, required: true },
    regexMode: { type: Boolean, required: true },
    searchInvalid: { type: Boolean, default: false },
    regexOpen: { type: Boolean, required: true },
    paletteOpen: { type: Boolean, required: true },
    dark: { type: Boolean, required: true },
    userInitials: { type: String, default: 'JD' },
  },
  computed: {
    placeholder() {
      return this.regexMode ? 'Regex filter — file names' : 'Filter files';
    },
  },
  methods: {
    onInput(event) {
      this.$emit('update-search', event.target.value);
    },
  },
};
</script>

<template>
  <header class="topbar" data-screen-label="Top bar">
    <div class="topbar__search" role="search">
      <m-icon name="search" :size="20" decorative class="topbar__search-icon" />
      <label class="visually-hidden" for="repo-file-search">{{ placeholder }}</label>
      <input
        id="repo-file-search"
        type="text"
        :value="search"
        :placeholder="placeholder"
        class="topbar__input"
        :aria-invalid="searchInvalid"
        aria-describedby="repo-search-help"
        @input="onInput"
      />
      <span id="repo-search-help" class="visually-hidden">
        {{ regexMode ? 'Filtering file and folder names as a regular expression.' : 'Filtering file and folder names as plain text.' }}
      </span>
      <button
        type="button"
        role="switch"
        :aria-checked="regexMode"
        aria-label="Regex search mode"
        title="Regex mode"
        class="topbar__pill"
        :class="{ 'is-active': regexMode }"
        @click="$emit('toggle-regex-mode')"
      >
        .*
      </button>
      <button
        type="button"
        class="topbar__icon-btn"
        title="Regex builder"
        aria-label="Open regex builder"
        aria-haspopup="dialog"
        :aria-expanded="regexOpen"
        @click="$emit('open-regex-builder')"
      >
        <m-icon name="tool" :size="18" decorative />
      </button>
    </div>
    <button
      type="button"
      class="topbar__icon-btn"
      title="Command palette (Ctrl+Shift+F)"
      aria-label="Open command palette"
      aria-haspopup="dialog"
      aria-keyshortcuts="Control+Shift+F"
      :aria-expanded="paletteOpen"
      @click="$emit('open-palette')"
    >
      <m-icon name="command" :size="20" decorative />
    </button>
    <button
      type="button"
      class="topbar__icon-btn"
      title="Toggle theme"
      :aria-label="dark ? 'Switch to light theme' : 'Switch to dark theme'"
      :aria-pressed="dark"
      @click="$emit('toggle-theme')"
    >
      <m-icon :name="dark ? 'sun' : 'moon'" :size="20" decorative />
    </button>
    <div class="topbar__avatar" aria-hidden="true">{{ userInitials }}</div>
  </header>
</template>

<style lang="scss" scoped>
@import '../repository.scss';

.topbar {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 24px 8px;
}

.topbar__search {
  flex: 1;
  max-width: 600px;
  display: flex;
  align-items: center;
  gap: 10px;
  background: var(--surfc);
  border-radius: 999px;
  padding: 8px 8px 8px 18px;
  color: var(--onsurfv);
}

.topbar__search-icon {
  flex-shrink: 0;
}

.topbar__input {
  border: none;
  outline: none;
  background: transparent;
  font: inherit;
  color: var(--onsurf);
  flex: 1;
  min-width: 0;

  &:focus-visible {
    outline: 2px solid var(--prim);
    outline-offset: 2px;
    border-radius: 6px;
  }
}

.topbar__pill {
  @include focus-ring;
  padding: 5px 10px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
  font-family: monospace;
  background: var(--surfch);
  color: var(--onsurfv);
  border: none;

  &.is-active {
    background: var(--prim);
    color: var(--onprim);
  }
}

.topbar__icon-btn {
  @include focus-ring;
  width: 32px;
  height: 32px;
  border-radius: 999px;
  border: none;
  background: transparent;
  color: var(--onsurfv);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  flex-shrink: 0;

  &:hover {
    background: var(--surfch);
  }
}

header > .topbar__icon-btn {
  width: 40px;
  height: 40px;
}

.topbar__avatar {
  width: 36px;
  height: 36px;
  border-radius: 999px;
  background: var(--primc);
  color: var(--onprimc);
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 13px;
  flex-shrink: 0;
}

.visually-hidden {
  @include visually-hidden;
}
</style>
