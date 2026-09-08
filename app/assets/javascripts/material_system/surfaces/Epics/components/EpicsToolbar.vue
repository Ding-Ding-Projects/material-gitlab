<script>
import MaterialButton from '~/material_system/components/material_button';
import MaterialTextField from '~/material_system/components/material_text_field';

import { __ } from '~/locale';
import MdsIcon from './MdsIcon.vue';

export default {
  methods: {
    __,
  },
  name: 'EpicsToolbar',
  components: { MaterialButton, MaterialTextField, MdsIcon },
  props: {
    search: { type: String, default: '' },
    regexMode: { type: Boolean, default: false },
    invalidMessage: { type: String, default: '' },
    isDark: { type: Boolean, default: false },
    userInitials: { type: String, default: '' },
  },
  computed: {
    placeholder() {
      return this.regexMode ? __('Regex search — epics') : __('Search epics');
    },
    themeLabel() {
      return this.isDark ? __('Switch to light theme') : __('Switch to dark theme');
    },
  },
};
</script>

<template>
  <header class="gl-mds-epics__topbar" :aria-label="__('Top bar')">
    <div class="gl-mds-epics__search">
      <span class="gl-mds-epics__search-icon"><mds-icon name="search" /></span>
      <label class="gl-mds-sr-only" for="epics-search-input">{{ __('Search epics') }}</label>
      <material-text-field
        id="epics-search-input"
        class="gl-mds-epics__search-input"
        type="text"
        :value="search"
        :placeholder="placeholder"
        :aria-invalid="Boolean(invalidMessage)"
        :aria-describedby="invalidMessage ? 'epics-search-invalid' : null"
        autocomplete="off"
        @input="$emit('update-search', $event)"
      :aria-label="placeholder" />
      <material-button variant="text"
        type="button"
        class="gl-mds-epics__regex-pill"
        :aria-pressed="regexMode"
        :aria-label="__('Toggle regex mode for search')"
        title="Regex mode"
        @click="$emit('toggle-regex-mode')"
      >
        .*
      </material-button>
      <material-button variant="text"
        type="button"
        class="gl-mds-epics__icon-btn"
        :aria-label="__('Open regex builder')"
        title="Regex builder"
        @click="$emit('open-regex-builder')"
      >
        <mds-icon name="tune" size="sm" />
      </material-button>
      <p
        v-if="invalidMessage"
        id="epics-search-invalid"
        class="gl-mds-epics__search-invalid"
        role="alert"
      >
        {{ invalidMessage }}
      </p>
    </div>
    <material-button variant="text"
      type="button"
      class="gl-mds-epics__topbar-btn"
      :aria-label="__('Command palette (Ctrl+Shift+F)')"
      title="Command palette (Ctrl+Shift+F)"
      @click="$emit('open-palette')"
    >
      <mds-icon name="command" />
    </material-button>
    <material-button variant="text"
      type="button"
      class="gl-mds-epics__topbar-btn"
      :aria-label="themeLabel"
      :title="themeLabel"
      @click="$emit('toggle-theme')"
    >
      <mds-icon :name="isDark ? 'sun' : 'moon'" />
    </material-button>
    <div class="gl-mds-epics__avatar" aria-hidden="true">{{ userInitials }}</div>
  </header>
</template>

<style scoped>
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
