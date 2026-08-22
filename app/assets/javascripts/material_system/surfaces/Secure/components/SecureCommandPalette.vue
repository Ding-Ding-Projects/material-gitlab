<template>
  <div class="secure-palette-scrim" @mousedown.self="close">
    <div
      ref="root"
      class="secure-palette"
      role="dialog"
      aria-modal="true"
      aria-label="Command palette"
      @keydown.esc="close"
      @keydown.down.prevent="move(1)"
      @keydown.up.prevent="move(-1)"
      @keydown.enter="runHighlighted"
    >
      <div class="secure-palette__search">
        <secure-icon name="search" />
        <label :for="queryId" class="secure-visually-hidden">Search actions</label>
        <input
          :id="queryId"
          ref="input"
          v-model="query"
          class="secure-palette__input"
          type="text"
          placeholder="Jump to a Secure action…"
          autocomplete="off"
        />
        <span class="secure-palette__hint">Ctrl+Shift+F</span>
      </div>
      <div class="secure-palette__results" role="listbox" aria-label="Secure actions">
        <button
          v-for="(result, index) in results"
          :key="result.id"
          type="button"
          role="option"
          class="secure-palette__result"
          :class="{ 'secure-palette__result--highlighted': index === highlightedIndex }"
          :aria-selected="index === highlightedIndex"
          @mouseenter="highlightedIndex = index"
          @click="run(result)"
        >
          <secure-icon :name="result.icon" />
          <span>{{ result.label }}</span>
          <span class="secure-palette__result-kind">Action</span>
        </button>
        <p v-if="results.length === 0" class="secure-palette__empty">No matches.</p>
      </div>
    </div>
  </div>
</template>

<script>
import { uniqueId } from 'lodash';
import SecureIcon from './SecureIcon.vue';

export default {
  name: 'SecureCommandPalette',
  components: { SecureIcon },
  props: {
    actions: { type: Array, required: true },
  },
  data() {
    return { query: '', highlightedIndex: 0, queryId: uniqueId('secure-palette-query-') };
  },
  computed: {
    results() {
      const query = this.query.toLowerCase();
      return this.actions.filter((action) => !query || action.label.toLowerCase().includes(query));
    },
  },
  watch: {
    results() {
      this.highlightedIndex = 0;
    },
  },
  mounted() {
    this.$nextTick(() => this.$refs.input && this.$refs.input.focus());
  },
  methods: {
    move(delta) {
      if (this.results.length === 0) return;
      const next = (this.highlightedIndex + delta + this.results.length) % this.results.length;
      this.highlightedIndex = next;
    },
    run(result) {
      result.run();
      this.close();
    },
    runHighlighted() {
      const result = this.results[this.highlightedIndex];
      if (result) this.run(result);
    },
    close() {
      this.$emit('close');
    },
  },
};
</script>
