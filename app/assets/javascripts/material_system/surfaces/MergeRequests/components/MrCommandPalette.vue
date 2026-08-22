<template>
  <div class="mr-overlay-backdrop" @mousedown.self="close" @keydown.esc="close">
    <div class="mr-command-palette" role="dialog" aria-modal="true" aria-label="Command palette">
      <div class="mr-command-palette__search">
        <span class="material-symbols-outlined" aria-hidden="true">keyboard_command_key</span>
        <input
          ref="input"
          v-model="query"
          type="text"
          class="mr-command-palette__input"
          placeholder="Search commands…"
          aria-label="Filter commands"
          @keydown.down.prevent="move(1)"
          @keydown.up.prevent="move(-1)"
          @keydown.enter.prevent="runActive"
        />
      </div>
      <ul
        v-if="filtered.length"
        class="mr-command-palette__list"
        role="listbox"
        aria-label="Available commands"
      >
        <li v-for="(action, index) in filtered" :key="action.label" role="presentation">
          <button
            type="button"
            class="mr-command-palette__item"
            role="option"
            :aria-selected="index === activeIndex ? 'true' : 'false'"
            :data-active="index === activeIndex"
            @mouseenter="activeIndex = index"
            @click="run(action)"
          >
            <span class="material-symbols-outlined" aria-hidden="true">{{ action.icon || 'chevron_right' }}</span>
            {{ action.label }}
          </button>
        </li>
      </ul>
      <p v-else class="mr-command-palette__empty">No commands match "{{ query }}".</p>
    </div>
  </div>
</template>

<script>
export default {
  name: 'MrCommandPalette',
  props: {
    actions: { type: Array, required: true },
  },
  data() {
    return {
      query: '',
      activeIndex: 0,
    };
  },
  computed: {
    filtered() {
      const needle = this.query.trim().toLowerCase();
      if (!needle) return this.actions;
      return this.actions.filter((action) => action.label.toLowerCase().includes(needle));
    },
  },
  watch: {
    filtered() {
      this.activeIndex = 0;
    },
  },
  mounted() {
    this.restoreFocusTo = document.activeElement;
    this.$nextTick(() => this.$refs.input && this.$refs.input.focus());
  },
  beforeDestroy() {
    if (this.restoreFocusTo && typeof this.restoreFocusTo.focus === 'function') {
      this.restoreFocusTo.focus();
    }
  },
  methods: {
    move(delta) {
      if (!this.filtered.length) return;
      const next = (this.activeIndex + delta + this.filtered.length) % this.filtered.length;
      this.activeIndex = next;
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
