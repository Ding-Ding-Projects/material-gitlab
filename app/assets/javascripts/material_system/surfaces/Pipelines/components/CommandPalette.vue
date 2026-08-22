<template>
  <div class="mgl-pl-scrim mgl-pl-scrim--top" @click="$emit('close')" @keydown.esc="$emit('close')">
    <div
      ref="panel"
      class="mgl-pl-dialog mgl-pl-palette"
      data-screen-label="Command palette"
      role="dialog"
      aria-modal="true"
      aria-label="Command palette"
      tabindex="-1"
      @click.stop
    >
      <div class="mgl-pl-palette-head">
        <span class="mgl-icon" aria-hidden="true">search</span>
        <label class="mgl-visually-hidden" for="mgl-pl-palette-query">Jump to an action</label>
        <input
          id="mgl-pl-palette-query"
          ref="input"
          :value="query"
          placeholder="Jump to a pipelines action…"
          role="searchbox"
          @input="query = $event.target.value"
          @keydown.down.prevent="moveFocus(1)"
          @keydown.up.prevent="moveFocus(-1)"
        />
        <span class="mgl-pl-palette-kbd">Ctrl+Shift+F</span>
      </div>
      <ul class="mgl-pl-palette-list" role="listbox" aria-label="Palette results">
        <li v-for="(result, index) in results" :key="result.label">
          <button
            :ref="`result-${index}`"
            type="button"
            class="mgl-pl-palette-result"
            role="option"
            @click="pick(result)"
          >
            <span class="mgl-icon" aria-hidden="true">{{ result.icon || 'bolt' }}</span>
            {{ result.label }}
            <span class="mgl-pl-palette-kind">Action</span>
          </button>
        </li>
      </ul>
      <div v-if="!results.length" class="mgl-pl-palette-empty">No matches.</div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'PipelinesCommandPalette',
  props: {
    actions: { type: Array, default: () => [] },
  },
  data() {
    return { query: '' };
  },
  computed: {
    results() {
      const q = this.query.toLowerCase();
      return this.actions.filter((action) => !q || action.label.toLowerCase().includes(q));
    },
  },
  mounted() {
    this.$refs.input.focus();
  },
  methods: {
    pick(result) {
      if (typeof result.run === 'function') result.run();
      this.$emit('close');
    },
    moveFocus(delta) {
      const buttons = this.results.map((_, index) => this.$refs[`result-${index}`]).filter(Boolean);
      if (!buttons.length) return;
      const current = buttons.indexOf(document.activeElement);
      const next = current === -1 ? 0 : (current + delta + buttons.length) % buttons.length;
      buttons[next].focus();
    },
  },
};
</script>

<style scoped>
.mgl-pl-palette {
  width: 560px;
  max-width: 92vw;
  overflow: hidden;
}

.mgl-pl-palette-head {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 14px 20px;
  border-bottom: 1px solid var(--outlv);
}

.mgl-pl-palette-head input {
  border: none;
  outline: none;
  background: transparent;
  font: inherit;
  font-size: 14.5px;
  color: var(--onsurf);
  flex: 1;
  min-width: 0;
}

.mgl-pl-palette-kbd {
  font-size: 11px;
  color: var(--onsurfv);
  border: 1px solid var(--outl);
  border-radius: 6px;
  padding: 2px 7px;
  flex-shrink: 0;
}

.mgl-pl-palette-list {
  max-height: 340px;
  overflow-y: auto;
  padding: 8px;
  margin: 0;
  list-style: none;
}

.mgl-pl-palette-result {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 14px;
  border-radius: 12px;
  font-size: 13.5px;
  color: var(--onsurf);
  width: 100%;
  text-align: left;
  background: transparent;
  border: none;
  cursor: pointer;
}

.mgl-pl-palette-result:hover,
.mgl-pl-palette-result:focus-visible {
  background: var(--surfc);
}

.mgl-pl-palette-kind {
  margin-left: auto;
  font-size: 11.5px;
  color: var(--onsurfv);
}

.mgl-pl-palette-empty {
  padding: 20px;
  text-align: center;
  font-size: 13px;
  color: var(--onsurfv);
}

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
