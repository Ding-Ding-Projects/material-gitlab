<template>
  <div class="cp-scrim" @mousedown.self="close">
    <div
      ref="dialog"
      class="cp-dialog"
      role="dialog"
      aria-modal="true"
      aria-label="Command palette"
      @keydown.esc.stop="close"
      @keydown.down.prevent="move(1)"
      @keydown.up.prevent="move(-1)"
      @keydown.enter.prevent="runActive"
    >
      <div class="cp-dialog__header">
        <search-field
          :value="query"
          @update:value="onQuery"
          :regex-mode="regexMode"
          @update:regex-mode="(v) => (regexMode = v)"
          placeholder="Jump to a Build action…"
          label="Filter Build commands"
          :corpus="actionLabels"
        />
        <span class="cp-hint">Ctrl+Shift+F</span>
      </div>
      <ul class="cp-list" role="listbox" :aria-activedescendant="activeId">
        <li
          v-for="(action, i) in filtered"
          :id="`cp-opt-${action.id}`"
          :key="action.id"
          role="option"
          :aria-selected="i === activeIndex"
          class="cp-list__item"
          :class="{ 'cp-list__item--active': i === activeIndex }"
          @mouseenter="activeIndex = i"
          @click="run(action)"
        >
          <icon :name="action.icon" />
          <span>{{ action.label }}</span>
          <span class="cp-list__kind">Action</span>
        </li>
        <li v-if="!filtered.length" class="cp-list__empty">No matches.</li>
      </ul>
    </div>
  </div>
</template>

<script>
import Icon from './Icon.vue';
import SearchField from './SearchField.vue';
import { matchesQuery } from '../data';

export default {
  name: 'CommandPaletteOverlay',
  components: { Icon, SearchField },
  props: {
    actions: { type: Array, default: () => [] },
  },
  data() {
    return {
      query: '',
      regexMode: false,
      activeIndex: 0,
    };
  },
  computed: {
    actionLabels() {
      return this.actions.map((a) => a.label);
    },
    filtered() {
      return this.actions.filter((a) => matchesQuery(a.label, this.query, this.regexMode));
    },
    activeId() {
      const active = this.filtered[this.activeIndex];
      return active ? `cp-opt-${active.id}` : undefined;
    },
  },
  watch: {
    filtered() {
      this.activeIndex = 0;
    },
  },
  mounted() {
    this.$nextTick(() => {
      const input = this.$el.querySelector('.search-field__input');
      if (input) input.focus();
    });
  },
  methods: {
    onQuery(value) {
      this.query = value;
    },
    move(delta) {
      if (!this.filtered.length) return;
      this.activeIndex = (this.activeIndex + delta + this.filtered.length) % this.filtered.length;
    },
    runActive() {
      const action = this.filtered[this.activeIndex];
      if (action) this.run(action);
    },
    run(action) {
      action.run();
      this.close();
    },
    close() {
      this.$emit('close');
    },
  },
};
</script>
