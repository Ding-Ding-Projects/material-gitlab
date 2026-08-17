<template>
  <div class="mg-scrim" @mousedown.self="close">
    <div ref="dialog" class="mg-palette" role="dialog" aria-modal="true" aria-label="Command palette" @keydown.esc="close">
      <div class="mg-palette__search">
        <MgIcon name="search" class="mg-palette__search-icon" />
        <label for="mg-palette-input" class="mg-visually-hidden">Search commands</label>
        <input
          id="mg-palette-input"
          ref="input"
          v-model="query"
          type="text"
          class="mg-palette__input"
          placeholder="Search commands…"
          @keydown.down.prevent="move(1)"
          @keydown.up.prevent="move(-1)"
          @keydown.enter.prevent="runActive"
        />
      </div>
      <ul class="mg-palette__list" role="listbox" aria-label="Commands">
        <li
          v-for="(action, index) in filteredActions"
          :key="action.label"
          role="option"
          class="mg-palette__item"
          :class="{ 'mg-palette__item--active': index === activeIndex }"
          :aria-selected="index === activeIndex"
          @mouseenter="activeIndex = index"
          @click="run(action)"
        >
          <MgIcon :name="action.icon || 'command'" size="small" />
          <span>{{ action.label }}</span>
        </li>
        <li v-if="filteredActions.length === 0" class="mg-palette__item mg-palette__item--empty">No matching commands.</li>
      </ul>
    </div>
  </div>
</template>

<script>
import MgIcon from './MgIcon.vue';

export default {
  name: 'CommandPalette',
  components: { MgIcon },
  props: {
    actions: { type: Array, required: true },
  },
  data() {
    return { query: '', activeIndex: 0 };
  },
  computed: {
    filteredActions() {
      const needle = this.query.trim().toLowerCase();
      if (!needle) return this.actions;
      return this.actions.filter((action) => action.label.toLowerCase().includes(needle));
    },
  },
  watch: {
    filteredActions() {
      this.activeIndex = 0;
    },
  },
  mounted() {
    this._previouslyFocused = document.activeElement;
    this.$nextTick(() => this.$refs.input && this.$refs.input.focus());
    document.addEventListener('keydown', this.trapTab, true);
  },
  beforeDestroy() {
    document.removeEventListener('keydown', this.trapTab, true);
    if (this._previouslyFocused && this._previouslyFocused.focus) this._previouslyFocused.focus();
  },
  methods: {
    move(delta) {
      const count = this.filteredActions.length;
      if (count === 0) return;
      this.activeIndex = (this.activeIndex + delta + count) % count;
    },
    runActive() {
      const action = this.filteredActions[this.activeIndex];
      if (action) this.run(action);
    },
    run(action) {
      if (typeof action.run === 'function') action.run();
      this.close();
    },
    close() {
      this.$emit('close');
    },
    trapTab(event) {
      if (event.key !== 'Tab' || !this.$refs.dialog) return;
      const focusable = this.$refs.dialog.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
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

<style lang="scss" scoped>
.mg-scrim {
  position: fixed;
  inset: 0;
  background: var(--mg-scrim);
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding: 12vh 16px 16px;
  z-index: 100;
}

.mg-palette {
  background: var(--mg-card);
  color: var(--mg-onsurf);
  border-radius: 20px;
  width: 100%;
  max-width: 560px;
  max-height: min(60vh, 480px);
  overflow: hidden;
  box-shadow: var(--mg-elevation-3);
  display: flex;
  flex-direction: column;
}

.mg-palette__search {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 14px 18px;
  border-bottom: 1px solid var(--mg-outlv);
}

.mg-palette__search-icon {
  color: var(--mg-onsurfv);
}

.mg-palette__input {
  flex: 1;
  border: none;
  outline: none;
  background: transparent;
  font: inherit;
  font-size: 15px;
  color: var(--mg-onsurf);
}

.mg-palette__list {
  list-style: none;
  margin: 0;
  padding: 8px;
  overflow-y: auto;
}

.mg-palette__item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 12px;
  border-radius: 12px;
  font-size: 13.5px;
  cursor: pointer;
  color: var(--mg-onsurf);
}

.mg-palette__item--active {
  background: var(--mg-primc);
  color: var(--mg-onprimc);
}

.mg-palette__item--empty {
  color: var(--mg-onsurfv);
  cursor: default;
  font-style: italic;
}
</style>
