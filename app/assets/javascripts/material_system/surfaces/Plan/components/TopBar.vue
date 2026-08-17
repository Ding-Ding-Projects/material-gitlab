<template>
  <header class="gl-mds-plan__topbar" data-screen-label="Top bar">
    <div class="gl-mds-plan__search" :class="{ 'gl-mds-plan__search--invalid': regexInvalid }">
      <mds-icon name="search" />
      <label class="gl-mds-sr-only" :for="searchId">{{ placeholder }}</label>
      <input
        :id="searchId"
        ref="searchInput"
        class="gl-mds-plan__search-input"
        type="search"
        autocomplete="off"
        :value="search"
        :placeholder="placeholder"
        :aria-invalid="regexInvalid ? 'true' : null"
        :aria-describedby="regexInvalid ? `${searchId}-error` : null"
        @input="$emit('update:search', $event.target.value)"
      />
      <button
        type="button"
        class="gl-mds-plan__regex-toggle"
        :class="{ 'gl-mds-plan__regex-toggle--on': regexMode }"
        :aria-pressed="regexMode"
        :title="regexToggleTitle"
        @click="$emit('toggle-regex-mode')"
      >
        .*
      </button>
      <button
        type="button"
        class="gl-mds-plan__icon-btn"
        title="Regex builder"
        aria-haspopup="dialog"
        :aria-expanded="regexBuilderOpen ? 'true' : 'false'"
        @click="$emit('open-regex-builder')"
      >
        <mds-icon name="construction" size="sm" />
        <span class="gl-mds-sr-only">Open regex builder</span>
      </button>
      <slot name="regex-popover" />
    </div>
    <span v-if="regexInvalid" :id="`${searchId}-error`" class="gl-mds-sr-only" role="alert">
      Invalid pattern — showing unfiltered results.
    </span>

    <button
      type="button"
      class="gl-mds-plan__icon-btn"
      title="Command palette (Ctrl+Shift+F)"
      aria-haspopup="dialog"
      @click="$emit('open-palette')"
    >
      <mds-icon name="command" />
      <span class="gl-mds-sr-only">Open command palette</span>
    </button>
    <button type="button" class="gl-mds-plan__icon-btn" :title="themeButtonTitle" @click="$emit('toggle-theme')">
      <mds-icon :name="dark ? 'light-mode' : 'dark-mode'" />
      <span class="gl-mds-sr-only">{{ themeButtonTitle }}</span>
    </button>
    <div class="gl-mds-plan__avatar" aria-hidden="true">{{ avatarInitials }}</div>
  </header>
</template>

<script>
import MdsIcon from './MdsIcon.vue';

export default {
  name: 'TopBar',
  components: { MdsIcon },
  props: {
    search: { type: String, default: '' },
    regexMode: { type: Boolean, default: false },
    regexInvalid: { type: Boolean, default: false },
    regexBuilderOpen: { type: Boolean, default: false },
    dark: { type: Boolean, default: false },
    tabLabel: { type: String, required: true },
    avatarInitials: { type: String, default: 'JD' },
  },
  computed: {
    searchId() {
      return 'gl-mds-plan-search';
    },
    placeholder() {
      const scope = this.tabLabel.toLowerCase();
      return this.regexMode ? `Regex search — ${scope}` : `Search ${scope}`;
    },
    regexToggleTitle() {
      return this.regexInvalid ? 'Regex mode (pattern invalid, showing all)' : 'Regex mode';
    },
    themeButtonTitle() {
      return this.dark ? 'Switch to light theme' : 'Switch to dark theme';
    },
  },
  methods: {
    focusSearch() {
      this.$refs.searchInput?.focus();
    },
  },
};
</script>

<style scoped lang="scss">
.gl-mds-plan__topbar {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 24px 8px;
}

.gl-mds-plan__search {
  position: relative;
  flex: 1;
  max-width: 600px;
  display: flex;
  align-items: center;
  gap: 10px;
  background: var(--gl-mds-surfc);
  border-radius: 999px;
  padding: 8px 8px 8px 18px;
  color: var(--gl-mds-onsurfv);
  border: 2px solid transparent;

  &--invalid {
    border-color: var(--gl-mds-warn);
  }
}

.gl-mds-plan__search-input {
  flex: 1;
  min-width: 0;
  border: none;
  outline: none;
  background: transparent;
  font: inherit;
  color: var(--gl-mds-onsurf);

  &::-webkit-search-cancel-button { -webkit-appearance: none; }
}

.gl-mds-plan__regex-toggle {
  padding: 5px 10px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 700;
  font-family: monospace;
  cursor: pointer;
  border: none;
  background: var(--gl-mds-surfch);
  color: var(--gl-mds-onsurfv);

  &--on {
    background: var(--gl-mds-prim);
    color: var(--gl-mds-onprim);
  }

  &:focus-visible {
    outline: 2px solid var(--gl-mds-prim);
    outline-offset: 2px;
  }
}

.gl-mds-plan__icon-btn {
  width: 40px;
  height: 40px;
  border-radius: 999px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  background: transparent;
  color: var(--gl-mds-onsurfv);
  cursor: pointer;
  flex-shrink: 0;

  &:hover { background: var(--gl-mds-surfch); }

  &:focus-visible {
    outline: 2px solid var(--gl-mds-prim);
    outline-offset: 2px;
  }
}

.gl-mds-plan__avatar {
  width: 36px;
  height: 36px;
  border-radius: 999px;
  background: var(--gl-mds-primc);
  color: var(--gl-mds-onprimc);
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 13px;
  flex-shrink: 0;
}

.gl-mds-sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}
</style>
