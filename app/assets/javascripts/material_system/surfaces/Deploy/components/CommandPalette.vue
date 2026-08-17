<template>
  <div class="dp-overlay" @click.self="$emit('close')">
    <div class="dp-palette" role="dialog" aria-modal="true" aria-label="Command palette" @keydown.esc="$emit('close')">
      <div class="dp-palette__search">
        <DpIcon name="search" />
        <label class="dp-visually-hidden" for="dp-palette-input">Jump to a Deploy action</label>
        <input
          id="dp-palette-input"
          ref="input"
          v-model="query"
          class="dp-palette__input"
          type="text"
          placeholder="Jump to an action…"
          role="combobox"
          aria-expanded="true"
          aria-controls="dp-palette-listbox"
          :aria-activedescendant="results.length ? `dp-palette-opt-${activeIndex}` : null"
          @keydown="onKeydown"
        />
        <span class="dp-palette__kbd">Ctrl+Shift+F</span>
      </div>
      <div id="dp-palette-listbox" class="dp-palette__list" role="listbox" aria-label="Command palette results">
        <button
          v-for="(result, idx) in results"
          :id="`dp-palette-opt-${idx}`"
          :key="result.label"
          type="button"
          role="option"
          class="dp-palette__row"
          :class="{ 'dp-palette__row--active': idx === activeIndex }"
          :aria-selected="idx === activeIndex ? 'true' : 'false'"
          @mouseenter="activeIndex = idx"
          @click="activate(result)"
        >
          <DpIcon :name="result.icon" />
          <span>{{ result.label }}</span>
        </button>
        <p v-if="!results.length" class="dp-palette__empty">No matches.</p>
      </div>
    </div>
  </div>
</template>

<script>
import DpIcon from './DpIcon.vue';

export default {
  name: 'CommandPalette',
  components: { DpIcon },
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
        .map((action) => ({ label: action.label, icon: action.icon || 'command', run: action.run }));
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
.dp-visually-hidden {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0 0 0 0);
  white-space: nowrap;
}

.dp-overlay {
  position: fixed;
  inset: 0;
  z-index: 90;
  background: var(--dp-scrim);
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding: 12vh 24px 24px;
}

.dp-palette {
  width: 100%;
  max-width: 560px;
  max-height: 60vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  background: var(--dp-card);
  color: var(--dp-onsurf);
  border-radius: 20px;
  box-shadow: 0 16px 40px rgba(0, 0, 0, 0.32);
}

.dp-palette__search {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 16px 18px;
  border-bottom: 1px solid var(--dp-outlv);
  color: var(--dp-onsurfv);
  flex-shrink: 0;
}

.dp-palette__input {
  flex: 1;
  min-width: 0;
  border: none;
  outline: none;
  background: transparent;
  font: inherit;
  font-size: 15px;
  color: var(--dp-onsurf);
}

.dp-palette__kbd {
  font-size: 11px;
  font-weight: 600;
  color: var(--dp-onsurfv);
  border: 1px solid var(--dp-outl);
  border-radius: 6px;
  padding: 2px 6px;
  flex-shrink: 0;
}

.dp-palette__list {
  overflow-y: auto;
  padding: 8px;
}

.dp-palette__row {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 12px;
  border-radius: 12px;
  border: none;
  background: transparent;
  color: var(--dp-onsurf);
  font: inherit;
  font-size: 13.5px;
  text-align: left;
  cursor: pointer;

  &--active {
    background: var(--dp-primc);
    color: var(--dp-onprimc);
  }

  &:focus-visible {
    outline: 2px solid var(--dp-prim);
    outline-offset: -2px;
  }
}

.dp-palette__empty {
  padding: 20px;
  text-align: center;
  font-size: 13px;
  color: var(--dp-onsurfv);
  margin: 0;
}
</style>
