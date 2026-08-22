<script>
// Port of design/Command Palette.dc.html, scoped to this surface. The real
// design's palette also lists every top-level page in the product (Issues,
// Pipelines, Admin area, ...); those are a different lane's surfaces and this
// component cannot make them navigate anywhere real, so every entry here is a
// genuine action this surface itself can perform — a decorative dead link would
// violate the "a control that looks operable must work" rule.
import MIcon from './MIcon.vue';

export default {
  name: 'CommandPalette',
  components: { MIcon },
  props: {
    actions: {
      type: Array,
      required: true,
      // { id, label, icon, kind, run }
    },
  },
  data() {
    return { query: '', activeIndex: 0 };
  },
  computed: {
    results() {
      const q = this.query.trim().toLowerCase();
      const filtered = !q ? this.actions : this.actions.filter((action) => action.label.toLowerCase().includes(q));
      return filtered;
    },
  },
  watch: {
    results() {
      this.activeIndex = 0;
    },
  },
  mounted() {
    this.$nextTick(() => this.$refs.queryInput && this.$refs.queryInput.focus());
  },
  methods: {
    setQuery(event) {
      this.query = event.target.value;
    },
    close() {
      this.$emit('close');
    },
    stop(event) {
      event.stopPropagation();
    },
    run(action) {
      if (action && typeof action.run === 'function') action.run();
      this.close();
    },
    move(delta) {
      if (!this.results.length) return;
      this.activeIndex = (this.activeIndex + delta + this.results.length) % this.results.length;
      this.$nextTick(() => {
        const el = this.$refs.optionEls && this.$refs.optionEls[this.activeIndex];
        if (el && el.scrollIntoView) el.scrollIntoView({ block: 'nearest' });
      });
    },
    activate() {
      const action = this.results[this.activeIndex];
      if (action) this.run(action);
    },
  },
};
</script>

<template>
  <div class="palette-scrim" role="presentation" @click="close">
    <div
      class="palette-dialog"
      role="dialog"
      aria-modal="true"
      aria-label="Command palette"
      @click="stop"
      @keydown.esc="close"
      @keydown.down.prevent="move(1)"
      @keydown.up.prevent="move(-1)"
      @keydown.enter.prevent="activate"
    >
      <div class="palette-dialog__search">
        <m-icon name="search" :size="18" decorative class="palette-dialog__search-icon" />
        <label class="visually-hidden" for="palette-query">Search actions</label>
        <input
          id="palette-query"
          ref="queryInput"
          type="text"
          :value="query"
          placeholder="Jump to a file, branch, or action…"
          role="combobox"
          aria-expanded="true"
          aria-controls="palette-listbox"
          :aria-activedescendant="results.length ? `palette-option-${activeIndex}` : null"
          @input="setQuery"
        />
        <span class="palette-dialog__hint">Ctrl+Shift+F</span>
      </div>
      <div id="palette-listbox" class="palette-dialog__results" role="listbox">
        <button
          v-for="(action, index) in results"
          :id="`palette-option-${index}`"
          :key="action.id"
          ref="optionEls"
          type="button"
          role="option"
          class="palette-option"
          :class="{ 'is-active': index === activeIndex }"
          :aria-selected="index === activeIndex"
          @mouseenter="activeIndex = index"
          @click="run(action)"
        >
          <m-icon :name="action.icon" :size="18" decorative class="palette-option__icon" />
          <span class="palette-option__label">{{ action.label }}</span>
          <span class="palette-option__kind">{{ action.kind }}</span>
        </button>
        <p v-if="!results.length" class="palette-dialog__empty">No matches.</p>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
@import '../repository.scss';

.palette-scrim {
  position: fixed;
  inset: 0;
  background: var(--scrim);
  z-index: 65;
  display: flex;
  justify-content: center;
  padding-top: 80px;
  align-items: flex-start;
}

.palette-dialog {
  @include overlay-surface(24px);
  @include reduced-motion;

  width: min(560px, calc(100vw - 48px));
  overflow: hidden;
  font-family: $font-stack;
  color: var(--onsurf);
}

.palette-dialog__search {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 14px 20px;
  border-bottom: 1px solid var(--outlv);
}

.palette-dialog__search-icon {
  color: var(--onsurfv);
}

.palette-dialog__search input {
  border: none;
  outline: none;
  background: transparent;
  font: inherit;
  font-size: 14.5px;
  color: var(--onsurf);
  flex: 1;
}

.palette-dialog__hint {
  font-size: 11px;
  color: var(--onsurfv);
  border: 1px solid var(--outl);
  border-radius: 6px;
  padding: 2px 7px;
  white-space: nowrap;
}

.palette-dialog__results {
  max-height: 340px;
  overflow-y: auto;
  padding: 8px;
}

.palette-option {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 14px;
  border-radius: 12px;
  font-size: 13.5px;
  color: var(--onsurf);
  width: 100%;
  text-align: left;
  background: none;
  border: none;
  cursor: pointer;

  &:hover,
  &.is-active {
    background: var(--surfc);
  }

  &:focus-visible {
    outline: 2px solid var(--prim);
    outline-offset: -2px;
  }
}

.palette-option__icon {
  color: var(--onsurfv);
  flex-shrink: 0;
}

.palette-option__label {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.palette-option__kind {
  font-size: 11.5px;
  color: var(--onsurfv);
  flex-shrink: 0;
}

.palette-dialog__empty {
  padding: 20px;
  text-align: center;
  font-size: 13px;
  color: var(--onsurfv);
  margin: 0;
}

.visually-hidden {
  @include visually-hidden;
}
</style>
