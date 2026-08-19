<template>
  <div class="gl-mds-palette-layer" @click.self="$emit('close')">
    <div
      ref="panel"
      class="gl-mds-palette"
      role="dialog"
      aria-modal="true"
      aria-label="Command palette"
      @keydown.esc="$emit('close')"
      @keydown.down.prevent="move(1)"
      @keydown.up.prevent="move(-1)"
      @keydown.enter="activateHighlighted"
      @keydown.tab="trapFocus"
    >
      <div class="gl-mds-palette__field">
        <mds-icon name="search" />
        <label class="gl-mds-sr-only" for="gl-mds-plan-palette-query">Jump to a Plan section or action</label>
        <input
          id="gl-mds-plan-palette-query"
          ref="queryInput"
          v-model="query"
          class="gl-mds-palette__input"
          placeholder="Jump to a Plan section or action…"
          autocomplete="off"
        />
        <span class="gl-mds-palette__hint">Ctrl+Shift+F</span>
      </div>
      <div class="gl-mds-palette__results" role="listbox" aria-label="Command palette results">
        <button
          v-for="(result, index) in results"
          :key="result.label"
          type="button"
          class="gl-mds-palette__result"
          :class="{ 'gl-mds-palette__result--active': index === highlighted }"
          role="option"
          :aria-selected="index === highlighted"
          @mouseenter="highlighted = index"
          @click="activate(result)"
        >
          <mds-icon :name="result.icon" />
          <span class="gl-mds-palette__result-label">{{ result.label }}</span>
          <span class="gl-mds-palette__result-kind">{{ result.kind }}</span>
        </button>
        <div v-if="results.length === 0" class="gl-mds-palette__empty">No matches.</div>
      </div>
    </div>
  </div>
</template>

<script>
import MdsIcon from './MdsIcon.vue';

export default {
  name: 'CommandPaletteOverlay',
  components: { MdsIcon },
  props: {
    actions: { type: Array, required: true },
  },
  data() {
    return { query: '', highlighted: 0 };
  },
  computed: {
    results() {
      const q = this.query.toLowerCase();
      return this.actions.filter((action) => !q || action.label.toLowerCase().includes(q));
    },
  },
  watch: {
    results() {
      this.highlighted = 0;
    },
  },
  mounted() {
    this.$refs.queryInput.focus();
  },
  methods: {
    move(delta) {
      if (this.results.length === 0) return;
      this.highlighted = (this.highlighted + delta + this.results.length) % this.results.length;
    },
    activateHighlighted() {
      const result = this.results[this.highlighted];
      if (result) this.activate(result);
    },
    activate(result) {
      result.run();
      this.$emit('close');
    },
    trapFocus(event) {
      const focusable = this.$refs.panel.querySelectorAll('button:not([disabled]), [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    },
  },
};
</script>

<style scoped lang="scss">
.gl-mds-palette-layer {
  position: fixed;
  inset: 0;
  background: var(--gl-mds-scrim);
  z-index: 65;
  display: flex;
  justify-content: center;
  padding-top: 80px;
  align-items: flex-start;
}

.gl-mds-palette {
  width: min(560px, 92vw);
  max-height: min(70vh, 480px);
  display: flex;
  flex-direction: column;
  background: var(--gl-mds-surf);
  border-radius: 24px;
  overflow: hidden;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
}

.gl-mds-palette__field {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 14px 20px;
  border-bottom: 1px solid var(--gl-mds-outlv);
  color: var(--gl-mds-onsurfv);
  flex-shrink: 0;
}

.gl-mds-palette__input {
  border: none;
  outline: none;
  background: transparent;
  font: inherit;
  font-size: 14.5px;
  color: var(--gl-mds-onsurf);
  flex: 1;
  min-width: 0;
}

.gl-mds-palette__hint {
  font-size: 11px;
  color: var(--gl-mds-onsurfv);
  border: 1px solid var(--gl-mds-outl);
  border-radius: 6px;
  padding: 2px 7px;
  flex-shrink: 0;
}

.gl-mds-palette__results {
  overflow-y: auto;
  padding: 8px;
}

.gl-mds-palette__result {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 14px;
  border-radius: 12px;
  font-size: 13.5px;
  color: var(--gl-mds-onsurf);
  border: none;
  background: none;
  cursor: pointer;
  font: inherit;
  text-align: left;

  &--active,
  &:hover { background: var(--gl-mds-surfc); }
  &:focus-visible { outline: 2px solid var(--gl-mds-prim); outline-offset: -2px; }
}

.gl-mds-palette__result-label { flex: 1; min-width: 0; }
.gl-mds-palette__result-kind { font-size: 11.5px; color: var(--gl-mds-onsurfv); flex-shrink: 0; }

.gl-mds-palette__empty {
  padding: 20px;
  text-align: center;
  font-size: 13px;
  color: var(--gl-mds-onsurfv);
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
