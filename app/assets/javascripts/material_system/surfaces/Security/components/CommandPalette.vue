<script>
import MaterialIcon from './icons/MaterialIcon.vue';
import trapFocus from '../focus_trap';

/**
 * Surface-local command palette, ported from the design's `dc-import name="Command
 * Palette"`. This surface owns only the Security dashboard, so it lists this
 * surface's own destinations and settings rather than the whole product — a
 * shell-level palette elsewhere is expected to compose several of these.
 */
export default {
  name: 'CommandPalette',
  components: { MaterialIcon },
  props: {
    actions: {
      type: Array,
      required: true,
      // [{ id, label, icon, group, run }]
    },
  },
  data() {
    return {
      query: '',
      activeIndex: 0,
    };
  },
  computed: {
    filteredActions() {
      const query = this.query.trim().toLowerCase();
      if (!query) return this.actions;
      return this.actions.filter((action) => action.label.toLowerCase().includes(query));
    },
    activeOptionId() {
      const action = this.filteredActions[this.activeIndex];
      return action ? `sec-palette-option-${action.id}` : undefined;
    },
  },
  watch: {
    filteredActions() {
      this.activeIndex = 0;
    },
  },
  mounted() {
    this.releaseTrap = trapFocus(this.$el, { initialFocus: '.sec-palette__input' });
    document.addEventListener('keydown', this.onKeydown);
  },
  beforeDestroy() {
    document.removeEventListener('keydown', this.onKeydown);
    if (this.releaseTrap) this.releaseTrap();
  },
  methods: {
    onKeydown(event) {
      if (event.key === 'Escape') {
        this.$emit('close');
      } else if (event.key === 'ArrowDown') {
        event.preventDefault();
        this.moveActive(1);
      } else if (event.key === 'ArrowUp') {
        event.preventDefault();
        this.moveActive(-1);
      } else if (event.key === 'Enter') {
        event.preventDefault();
        this.runActive();
      }
    },
    moveActive(delta) {
      const count = this.filteredActions.length;
      if (count === 0) return;
      this.activeIndex = (this.activeIndex + delta + count) % count;
    },
    runActive() {
      const action = this.filteredActions[this.activeIndex];
      if (action) this.runAction(action);
    },
    runAction(action) {
      action.run();
      this.$emit('close');
    },
    onScrimClick() {
      this.$emit('close');
    },
  },
};
</script>

<template>
  <div>
    <div class="sec-scrim" @click="onScrimClick"></div>
    <div class="sec-palette" role="dialog" aria-modal="true" aria-label="Command palette">
      <div class="sec-palette__search">
        <material-icon name="search" />
        <input
          v-model="query"
          class="sec-palette__input"
          type="text"
          role="combobox"
          aria-expanded="true"
          aria-controls="sec-palette-listbox"
          aria-autocomplete="list"
          :aria-activedescendant="activeOptionId"
          placeholder="Search Security dashboard commands"
          aria-label="Search commands"
          autocomplete="off"
        />
        <kbd class="sec-palette__kbd">Esc</kbd>
      </div>
      <ul id="sec-palette-listbox" class="sec-palette__list" role="listbox" aria-label="Commands">
        <li
          v-for="(action, index) in filteredActions"
          :id="`sec-palette-option-${action.id}`"
          :key="action.id"
          role="option"
          class="sec-palette__item"
          :class="{ 'sec-palette__item--active': index === activeIndex }"
          :aria-selected="index === activeIndex"
          @mouseenter="activeIndex = index"
          @click="runAction(action)"
        >
          <material-icon :name="action.icon" :size="18" />
          <span>{{ action.label }}</span>
        </li>
        <li v-if="filteredActions.length === 0" class="sec-palette__empty">No matching commands.</li>
      </ul>
      <div class="sec-palette__footer">
        <span><kbd>↑</kbd><kbd>↓</kbd> navigate</span>
        <span><kbd>Enter</kbd> run</span>
        <span><kbd>Esc</kbd> close</span>
      </div>
    </div>
  </div>
</template>
