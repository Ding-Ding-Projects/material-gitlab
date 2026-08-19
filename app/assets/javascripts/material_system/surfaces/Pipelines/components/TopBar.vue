<template>
  <header class="mgl-pl-topbar" aria-label="Pipelines top bar">
    <div class="mgl-pl-search">
      <span class="mgl-icon" aria-hidden="true">search</span>
      <label class="mgl-visually-hidden" for="mgl-pl-search-input">Search pipelines</label>
      <input
        id="mgl-pl-search-input"
        type="search"
        :value="search"
        :placeholder="searchPlaceholder"
        :maxlength="regexMode ? patternLimit : null"
        role="searchbox"
        :aria-describedby="regexMode ? 'mgl-pl-search-hint' : null"
        @input="$emit('update:search', $event.target.value)"
      />
      <button
        type="button"
        class="mgl-pl-chip-btn"
        :style="{ background: regexMode ? 'var(--prim)' : 'var(--surfch)', color: regexMode ? 'var(--onprim)' : 'var(--onsurfv)' }"
        :aria-pressed="regexMode"
        title="Regex mode"
        aria-label="Toggle regex search mode"
        @click="$emit('toggle-regex-mode')"
      >
        .*
      </button>
      <button
        type="button"
        class="mgl-pl-icon-btn"
        title="Regex builder"
        aria-label="Open regex builder"
        aria-haspopup="dialog"
        @click="$emit('open-regex-builder')"
      >
        <span class="mgl-icon mgl-icon--sm" aria-hidden="true">construction</span>
      </button>
      <span v-if="regexMode" id="mgl-pl-search-hint" class="mgl-visually-hidden">Regex mode is on. Search text is evaluated as a regular expression.</span>
    </div>
    <button
      type="button"
      class="mgl-pl-icon-btn mgl-pl-icon-btn--lg"
      title="Command palette (Ctrl+Shift+F)"
      aria-label="Open command palette"
      aria-haspopup="dialog"
      @click="$emit('open-palette')"
    >
      <span class="mgl-icon" aria-hidden="true">keyboard_command_key</span>
    </button>
    <button
      type="button"
      class="mgl-pl-icon-btn mgl-pl-icon-btn--lg"
      title="Toggle theme"
      :aria-label="dark ? 'Switch to light theme' : 'Switch to dark theme'"
      @click="$emit('toggle-theme')"
    >
      <span class="mgl-icon" aria-hidden="true">{{ dark ? 'light_mode' : 'dark_mode' }}</span>
    </button>
    <div class="mgl-pl-avatar" role="img" aria-label="Signed in as JD">JD</div>
  </header>
</template>

<script>
import { REGEX_LIMITS } from '../../../regex-builder';

export default {
  name: 'PipelinesTopBar',
  props: {
    search: { type: String, default: '' },
    regexMode: { type: Boolean, default: false },
    dark: { type: Boolean, default: false },
  },
  computed: {
    searchPlaceholder() {
      return this.regexMode ? 'Regex search — title, branch, sha, id' : 'Search pipelines';
    },
    patternLimit() {
      return REGEX_LIMITS.pattern;
    },
  },
};
</script>

<style scoped>
.mgl-visually-hidden {
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
