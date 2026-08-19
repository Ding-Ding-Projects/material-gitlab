<template>
  <div v-if="open" class="am-overlay-scrim" @mousedown.self="close">
    <div
      ref="palette"
      class="am-palette"
      role="dialog"
      aria-modal="true"
      aria-label="Command palette"
      tabindex="-1"
      @keydown.esc="close"
    >
      <div class="am-palette__search">
        <MaterialIcon name="command" :size="18" />
        <label for="am-palette-input" class="am-visually-hidden">Command palette search</label>
        <input
          id="am-palette-input"
          ref="filterInput"
          type="text"
          class="am-palette__input"
          role="combobox"
          aria-expanded="true"
          aria-autocomplete="list"
          aria-controls="am-palette-listbox"
          :aria-activedescendant="filtered.length ? `am-palette-option-${highlighted}` : undefined"
          placeholder="Jump to a tab, action, block, skill, session, or revision…"
          :value="query"
          @input="onQuery"
          @keydown.down.prevent="move(1)"
          @keydown.up.prevent="move(-1)"
          @keydown.enter.prevent="runHighlighted"
        />
        <kbd class="am-palette__hint">Esc</kbd>
      </div>
      <ul id="am-palette-listbox" class="am-palette__list" role="listbox" aria-label="Command palette results">
        <li v-if="filtered.length === 0" class="am-palette__empty">No matching commands.</li>
        <li
          v-for="(action, index) in filtered"
          :id="`am-palette-option-${index}`"
          :key="action.id"
          role="option"
          class="am-palette__item"
          :class="{ 'am-palette__item--active': index === highlighted }"
          :aria-selected="index === highlighted ? 'true' : 'false'"
          @mouseenter="highlighted = index"
          @click="run(action)"
        >
          <MaterialIcon :name="action.icon || 'command'" :size="17" />
          <span class="am-palette__item-label">{{ action.label }}</span>
          <span v-if="action.group" class="am-palette__item-group">{{ action.group }}</span>
        </li>
      </ul>
    </div>
  </div>
</template>

<script>
import MaterialIcon from './MaterialIcon.vue';

export default {
  name: 'CommandPalette',
  components: { MaterialIcon },
  props: {
    open: {
      type: Boolean,
      default: false,
    },
    actions: {
      type: Array,
      required: true,
    },
  },
  data() {
    return {
      query: '',
      highlighted: 0,
      returnFocusEl: null,
    };
  },
  computed: {
    filtered() {
      const q = this.query.trim().toLowerCase();
      if (!q) return this.actions;
      return this.actions.filter(
        (action) =>
          action.label.toLowerCase().includes(q) || (action.group || '').toLowerCase().includes(q),
      );
    },
  },
  watch: {
    open(isOpen) {
      if (isOpen) {
        this.returnFocusEl = document.activeElement;
        this.query = '';
        this.highlighted = 0;
        this.$nextTick(() => this.$refs.filterInput && this.$refs.filterInput.focus());
      } else if (this.returnFocusEl && typeof this.returnFocusEl.focus === 'function') {
        this.returnFocusEl.focus();
      }
    },
  },
  methods: {
    onQuery(event) {
      this.query = event.target.value;
      this.highlighted = 0;
    },
    move(delta) {
      if (this.filtered.length === 0) return;
      this.highlighted = (this.highlighted + delta + this.filtered.length) % this.filtered.length;
    },
    runHighlighted() {
      const action = this.filtered[this.highlighted];
      if (action) this.run(action);
    },
    run(action) {
      this.close();
      this.$nextTick(() => action.run());
    },
    close() {
      this.$emit('close');
    },
  },
};
</script>
