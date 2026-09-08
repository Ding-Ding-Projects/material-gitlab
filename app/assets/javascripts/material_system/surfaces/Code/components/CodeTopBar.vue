<template>
  <header class="gl-code-topbar" aria-label="Code top bar">
    <div class="gl-code-search">
      <span class="gl-code-search__icon"><material-icon name="search" :size="20" /></span>
      <label class="gl-code-visually-hidden" for="gl-code-search-input">{{ searchPlaceholder }}</label>
      <material-text-field
        id="gl-code-search-input" aria-label="Search code"
        class="gl-code-search__input"
        type="search"
        :value="search"
        :placeholder="searchPlaceholder"
        @input="$emit('update:search', $event)"
      ></material-text-field>
      <material-button variant="text"
        type="button"
        class="gl-code-search__chip"
        :class="{ 'is-active': regexMode }"
        :aria-pressed="regexMode ? 'true' : 'false'"
        title="Regex mode"
        @click="$emit('toggle-regex-mode')"
      >.*</material-button>
      <material-button variant="text"
        type="button"
        class="gl-code-iconbtn"
        title="Regex builder"
        aria-haspopup="dialog"
        @click="$emit('open-regex-builder')"
      ><material-icon name="construction" :size="18" /></material-button>
    </div>
    <material-button variant="text"
      type="button"
      class="gl-code-iconbtn gl-code-iconbtn--lg"
      title="Command palette (Ctrl+Shift+F)"
      aria-haspopup="dialog"
      @click="$emit('open-palette')"
    ><material-icon name="command" :size="20" /></material-button>
    <material-button variant="text"
      type="button"
      class="gl-code-iconbtn gl-code-iconbtn--lg"
      :title="isDark ? 'Switch to light theme' : 'Switch to dark theme'"
      @click="$emit('toggle-theme')"
    ><material-icon :name="isDark ? 'light_mode' : 'dark_mode'" :size="20" /></material-button>
    <div class="gl-code-avatar" :title="userInitials" aria-hidden="true">{{ userInitials }}</div>
  </header>
</template>

<script>
import MaterialIcon from './MaterialIcon.vue';
import MaterialButton from '../../../components/material_button';
import MaterialTextField from '../../../components/material_text_field';

export default {
  name: 'CodeTopBar',
  components: { MaterialIcon, MaterialButton, MaterialTextField },
  props: {
    search: { type: String, default: '' },
    regexMode: { type: Boolean, default: false },
    searchPlaceholder: { type: String, required: true },
    userInitials: { type: String, default: 'JD' },
    isDark: { type: Boolean, default: false },
  },
};
</script>

<style lang="scss" scoped>
.gl-code-visually-hidden {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0 0 0 0);
  white-space: nowrap;
}
</style>
