<template>
  <div class="material-command-palette__scrim" role="presentation" @click.self="$emit('close')">
    <section ref="dialog" class="material-command-palette" role="dialog" aria-modal="true" aria-labelledby="material-command-palette-title">
      <h2 id="material-command-palette-title" class="sr-only">Command palette</h2>
      <div class="material-command-palette__search-wrap">
        <label class="sr-only" :for="searchId">Jump to page, setting, or action</label>
        <input :id="searchId" ref="search" v-model="query" class="material-command-palette__search" type="search" placeholder="Jump to page, setting, or action…" autocomplete="off" @keydown="onKeydown" />
        <kbd>Ctrl+Shift+F</kbd>
      </div>
      <div class="material-command-palette__list" role="listbox" :aria-label="`${filteredActions.length} command results`">
        <button v-for="(action, index) in filteredActions" :key="action.id || action.label" type="button" class="material-command-palette__item" :class="{ 'is-active': index === activeIndex }" role="option" :aria-selected="index === activeIndex" @click="activate(action)">
          <span class="material-command-palette__icon" aria-hidden="true">{{ action.icon || '•' }}</span>
          <span>{{ action.label }}</span>
          <small>{{ action.kind || action.group || 'Action' }}</small>
        </button>
        <p v-if="!filteredActions.length" class="material-command-palette__empty" role="status">No commands match.</p>
      </div>
    </section>
  </div>
</template>

<script>
export default {
  name: 'MaterialCommandPalette',
  props: { actions: { type: Array, default: () => [] } },
  data() { return { query: '', activeIndex: 0 }; },
  computed: {
    searchId() { return `material-command-palette-search-${this._uid}`; },
    filteredActions() {
      const needle = this.query.trim().toLocaleLowerCase();
      return this.actions.filter((action) => !needle || `${action.label} ${action.group || ''} ${action.kind || ''}`.toLocaleLowerCase().includes(needle));
    },
  },
  watch: { query() { this.activeIndex = 0; } },
  mounted() { this.$nextTick(() => this.$refs.search?.focus()); this.previousFocus = document.activeElement; },
  beforeDestroy() { this.previousFocus?.focus?.(); },
  methods: {
    onKeydown(event) {
      if (event.key === 'Escape') { event.preventDefault(); this.$emit('close'); }
      else if (event.key === 'ArrowDown') { event.preventDefault(); this.activeIndex = Math.min(this.activeIndex + 1, this.filteredActions.length - 1); }
      else if (event.key === 'ArrowUp') { event.preventDefault(); this.activeIndex = Math.max(this.activeIndex - 1, 0); }
      else if (event.key === 'Enter' && this.filteredActions[this.activeIndex]) { event.preventDefault(); this.activate(this.filteredActions[this.activeIndex]); }
    },
    async activate(action) {
      if (typeof action.run === 'function') await action.run();
      this.$emit('select', action);
      this.$emit('close');
    },
  },
};
</script>

<style lang="scss" src="../shared-shell.scss"></style>
