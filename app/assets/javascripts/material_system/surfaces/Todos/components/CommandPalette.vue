<script>
import MdIcon from './MdIcon.vue';
import { createPaletteDestinations } from '../data';

/** Ctrl+Shift+F command palette: static page destinations plus caller-supplied actions. */
export default {
  name: 'CommandPalette',
  components: { MdIcon },
  props: {
    actions: {
      type: Array,
      default: () => [],
    },
  },
  data() {
    return { query: '' };
  },
  computed: {
    results() {
      const pages = createPaletteDestinations();
      const actionResults = this.actions.map((action) => ({
        label: action.label,
        icon: action.icon || 'settings',
        href: '#',
        kind: 'Action',
        run: action.run,
      }));
      const all = [...pages, ...actionResults];
      const q = this.query.toLowerCase();
      return all.filter((result) => !q || result.label.toLowerCase().includes(q));
    },
    isEmpty() {
      return this.results.length === 0;
    },
  },
  mounted() {
    this._onKeydown = (event) => {
      if (event.key === 'Escape') this.close();
      else if (event.key === 'ArrowDown') this.moveFocus(1, event);
      else if (event.key === 'ArrowUp') this.moveFocus(-1, event);
    };
    window.addEventListener('keydown', this._onKeydown);
    this.$nextTick(() => this.$refs.queryInput && this.$refs.queryInput.focus());
  },
  beforeDestroy() {
    window.removeEventListener('keydown', this._onKeydown);
  },
  methods: {
    moveFocus(delta, event) {
      const items = Array.from(this.$el.querySelectorAll('[data-palette-result]'));
      if (items.length === 0) return;
      event.preventDefault();
      const current = items.indexOf(document.activeElement);
      const next = current === -1 ? 0 : (current + delta + items.length) % items.length;
      items[next].focus();
    },
    activate(result, event) {
      if (result.run) {
        event.preventDefault();
        result.run();
      }
      this.close();
    },
    close() {
      this.$emit('close');
    },
  },
};
</script>

<template>
  <div class="md-todos__scrim md-todos__scrim--top" @click="close">
    <div
      class="md-todos__palette"
      role="dialog"
      aria-modal="true"
      aria-label="Command palette"
      data-screen-label="Command palette"
      @click.stop
    >
      <div class="md-todos__palette-search">
        <md-icon name="search" />
        <label class="md-todos__visually-hidden" for="palette-query">Jump to page, setting, or action</label>
        <input
          id="palette-query"
          ref="queryInput"
          v-model="query"
          class="md-todos__palette-input"
          type="text"
          placeholder="Jump to page, setting, or action…"
        />
        <span class="md-todos__kbd-hint">Ctrl+Shift+F</span>
      </div>

      <div class="md-todos__palette-results" role="listbox" aria-label="Command palette results">
        <a
          v-for="(result, idx) in results"
          :key="idx"
          :href="result.href"
          data-palette-result
          class="md-todos__palette-result"
          role="option"
          @click="activate(result, $event)"
        >
          <md-icon :name="result.icon" />
          <span>{{ result.label }}</span>
          <span class="md-todos__palette-kind">{{ result.kind }}</span>
        </a>
        <div v-if="isEmpty" class="md-todos__palette-empty">No matches.</div>
      </div>
    </div>
  </div>
</template>
