<script>
import { __ } from '~/locale';
import MdsIcon from './MdsIcon.vue';

/**
 * A local command palette scoped to this surface's own actions (theme, view,
 * search, selection). Cross-surface page navigation belongs to the shared
 * "Command Palette" design contract, owned by a separate lane; this overlay
 * intentionally does not duplicate that global page list.
 */
export default {
  name: 'CommandPaletteOverlay',
  components: { MdsIcon },
  props: {
    actions: { type: Array, required: true },
  },
  data() {
    return { query: '', activeIndex: 0 };
  },
  computed: {
    results() {
      const query = this.query.toLowerCase();
      if (!query) return this.actions;
      return this.actions.filter((action) => action.label.toLowerCase().includes(query));
    },
  },
  watch: {
    results(newResults) {
      if (this.activeIndex >= newResults.length) this.activeIndex = Math.max(0, newResults.length - 1);
    },
  },
  mounted() {
    this.$refs.input.focus();
  },
  methods: {
    stop(event) {
      event.stopPropagation();
    },
    run(action) {
      if (action) action.run();
      this.$emit('close');
    },
    onKeydown(event) {
      if (event.key === 'ArrowDown') {
        event.preventDefault();
        this.activeIndex = Math.min(this.activeIndex + 1, this.results.length - 1);
      } else if (event.key === 'ArrowUp') {
        event.preventDefault();
        this.activeIndex = Math.max(this.activeIndex - 1, 0);
      } else if (event.key === 'Enter') {
        event.preventDefault();
        this.run(this.results[this.activeIndex]);
      }
    },
  },
};
</script>

<template>
  <div class="gl-mds-epics__scrim gl-mds-epics__scrim--top" role="presentation" @click="$emit('close')">
    <div
      class="gl-mds-epics__dialog gl-mds-epics__dialog--palette"
      role="dialog"
      aria-modal="true"
      :aria-label="__('Command palette')"
      @click="stop"
    >
      <div class="gl-mds-epics__palette-search">
        <mds-icon name="search" />
        <label class="gl-mds-sr-only" for="epics-palette-input">{{
          __('Jump to an action')
        }}</label>
        <input
          id="epics-palette-input"
          ref="input"
          v-model="query"
          class="gl-mds-epics__palette-input"
          type="text"
          :placeholder="__('Jump to an action…')"
          role="combobox"
          aria-expanded="true"
          aria-controls="epics-palette-list"
          @keydown="onKeydown"
        />
        <span class="gl-mds-epics__palette-kbd">Ctrl+Shift+F</span>
      </div>
      <div id="epics-palette-list" class="gl-mds-epics__palette-list" role="listbox">
        <button
          v-for="(action, index) in results"
          :key="action.id"
          type="button"
          role="option"
          class="gl-mds-epics__palette-item"
          :class="{ 'gl-mds-epics__palette-item--active': index === activeIndex }"
          :aria-selected="index === activeIndex"
          @mouseenter="activeIndex = index"
          @click="run(action)"
        >
          <mds-icon :name="action.icon || 'check-circle'" size="sm" />
          {{ action.label }}
        </button>
        <div v-if="!results.length" class="gl-mds-epics__palette-empty">{{ __('No matches.') }}</div>
      </div>
    </div>
  </div>
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
