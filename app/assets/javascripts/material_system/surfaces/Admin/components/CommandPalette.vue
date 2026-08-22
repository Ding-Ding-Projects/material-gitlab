<template>
  <div v-if="open" class="gl-mds-admin-scrim gl-mds-admin-scrim--palette" @mousedown.self="close">
    <div
      ref="dialog"
      class="gl-mds-admin-palette"
      role="dialog"
      aria-modal="true"
      aria-label="Command palette"
      @keydown.esc="close"
      @keydown.down.prevent="move(1)"
      @keydown.up.prevent="move(-1)"
      @keydown.enter="activate"
    >
      <SearchField
        ref="search"
        :value="query"
        :regex-mode="regexMode"
        placeholder="Search admin actions…"
        aria-label="Search command palette actions"
        icon="search"
        :corpus="actions.map((action) => action.label)"
        @input="onQuery"
        @update:regex-mode="onRegexMode"
      />
      <ul class="gl-mds-admin-palette__list" role="listbox" aria-label="Admin actions">
        <li
          v-for="(action, index) in filteredActions"
          :id="`gl-mds-admin-palette-option-${action.id}`"
          :key="action.id"
          role="option"
          class="gl-mds-admin-palette__option"
          :class="{ 'gl-mds-admin-palette__option--active': index === activeIndex }"
          :aria-selected="index === activeIndex"
          @mouseenter="activeIndex = index"
          @click="select(action)"
        >
          <Icon :name="action.icon" :size="18" />
          {{ action.label }}
        </li>
      </ul>
      <p v-if="!filteredActions.length" class="gl-mds-admin-palette__empty">No matching actions.</p>
    </div>
  </div>
</template>

<script>
import Icon from './Icon.vue';
import SearchField from './SearchField.vue';
import { createTextMatcher } from '../data';

export default {
  name: 'CommandPalette',
  components: { Icon, SearchField },
  props: {
    open: { type: Boolean, default: false },
    actions: { type: Array, required: true },
  },
  data() {
    return { query: '', regexMode: false, activeIndex: 0 };
  },
  computed: {
    filteredActions() {
      const matcher = createTextMatcher(this.query, this.regexMode);
      return this.actions.filter((action) => matcher.test(action.label));
    },
  },
  watch: {
    open(isOpen) {
      if (isOpen) {
        this.query = '';
        this.regexMode = false;
        this.activeIndex = 0;
        this.$nextTick(() => {
          const input = this.$refs.search && this.$refs.search.$el.querySelector('input');
          if (input) input.focus();
        });
      }
    },
    filteredActions() {
      this.activeIndex = 0;
    },
  },
  methods: {
    onQuery(value) {
      this.query = value;
    },
    onRegexMode(value) {
      this.regexMode = value;
    },
    move(delta) {
      const count = this.filteredActions.length;
      if (!count) return;
      this.activeIndex = (this.activeIndex + delta + count) % count;
    },
    activate() {
      const action = this.filteredActions[this.activeIndex];
      if (action) this.select(action);
    },
    select(action) {
      action.run();
      this.close();
    },
    close() {
      this.$emit('close');
    },
  },
};
</script>
