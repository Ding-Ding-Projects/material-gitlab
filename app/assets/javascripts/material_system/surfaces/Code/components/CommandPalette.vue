<template>
  <div class="gl-code-overlay gl-code-overlay--top" @click.self="$emit('close')">
    <div
      class="gl-code-dialog gl-code-dialog--palette"
      role="dialog"
      aria-modal="true"
      aria-label="Command palette"
      @keydown.esc="$emit('close')"
    >
      <div class="gl-code-palette__search">
        <material-icon name="search" :size="20" />
        <label class="gl-code-visually-hidden" for="gl-code-palette-input">Jump to a Code action</label>
        <input
          id="gl-code-palette-input"
          ref="input"
          class="gl-code-palette__input"
          type="text"
          v-model="query"
          placeholder="Jump to an action…"
          role="combobox"
          aria-expanded="true"
          aria-controls="gl-code-palette-list"
          :aria-activedescendant="results.length ? `gl-code-palette-opt-${activeIndex}` : null"
          @keydown="onKeydown"
        >
        <span class="gl-code-palette__kbd">Ctrl+Shift+F</span>
      </div>
      <div id="gl-code-palette-list" class="gl-code-palette__list" role="listbox" aria-label="Command palette results">
        <button
          v-for="(result, idx) in results"
          :id="`gl-code-palette-opt-${idx}`"
          :key="result.label"
          type="button"
          role="option"
          class="gl-code-palette__row"
          :class="{ 'is-active-option': idx === activeIndex }"
          :aria-selected="idx === activeIndex ? 'true' : 'false'"
          @mouseenter="activeIndex = idx"
          @click="activate(result)"
        >
          <material-icon :name="result.icon" :size="20" />{{ result.label }}
          <span class="gl-code-palette__kind">Action</span>
        </button>
        <div v-if="!results.length" style="padding:20px;text-align:center;font-size:13px;color:var(--onsurfv)">
          No matches.
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import MaterialIcon from './MaterialIcon.vue';

export default {
  name: 'CommandPalette',
  components: { MaterialIcon },
  props: {
    actions: { type: Array, default: () => [] },
  },
  data() {
    return { query: '', activeIndex: 0 };
  },
  computed: {
    results() {
      const q = this.query.toLowerCase();
      return this.actions
        .filter((action) => !q || action.label.toLowerCase().includes(q))
        .map((action) => ({ label: action.label, icon: action.icon || 'construction', run: action.run }));
    },
  },
  watch: {
    query() {
      this.activeIndex = 0;
    },
  },
  mounted() {
    this.$nextTick(() => this.$refs.input && this.$refs.input.focus());
  },
  methods: {
    activate(result) {
      if (typeof result.run === 'function') result.run();
      this.$emit('close');
    },
    onKeydown(event) {
      if (event.key === 'ArrowDown') {
        event.preventDefault();
        if (this.results.length) this.activeIndex = (this.activeIndex + 1) % this.results.length;
      } else if (event.key === 'ArrowUp') {
        event.preventDefault();
        if (this.results.length) this.activeIndex = (this.activeIndex - 1 + this.results.length) % this.results.length;
      } else if (event.key === 'Enter') {
        event.preventDefault();
        const result = this.results[this.activeIndex];
        if (result) this.activate(result);
      }
    },
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
