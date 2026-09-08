<template>
  <div class="material-command-palette__scrim" role="presentation" @click.self="$emit('close')">
    <section ref="dialog" class="material-command-palette" role="dialog" aria-modal="true" :aria-labelledby="titleId" @keydown="onKeydown">
      <h2 :id="titleId" class="sr-only">Command palette</h2>
      <div class="material-command-palette__search-wrap">
        <label class="sr-only" :for="searchId">Jump to page, setting, or action</label>
        <input :id="searchId" ref="search" v-model="query" class="material-command-palette__search" type="search" role="combobox" aria-expanded="true" :aria-controls="listId" :aria-activedescendant="activeOptionId" placeholder="Jump to page, setting, or action…" autocomplete="off" />
        <kbd>Ctrl+Shift+F</kbd>
      </div>
      <div :id="listId" class="material-command-palette__list" role="listbox" :aria-label="`${filteredActions.length} command results`">
        <button v-for="(action, index) in filteredActions" :id="optionId(index)" :key="action.id || action.label" type="button" class="material-command-palette__item" :class="{ 'is-active': index === activeIndex }" role="option" :aria-selected="index === activeIndex" @focus="activeIndex = index" @click="activate(action)">
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
    titleId() { return `material-command-palette-title-${this._uid}`; },
    listId() { return `material-command-palette-list-${this._uid}`; },
    activeOptionId() { return this.filteredActions.length ? this.optionId(this.activeIndex) : null; },
    filteredActions() {
      const needle = this.query.trim().toLocaleLowerCase();
      return this.actions.filter((action) => !needle || `${action.label} ${action.group || ''} ${action.kind || ''}`.toLocaleLowerCase().includes(needle));
    },
  },
  watch: {
    query() { this.activeIndex = 0; },
    filteredActions(actions) {
      this.activeIndex = Math.max(0, Math.min(this.activeIndex, actions.length - 1));
    },
  },
  mounted() { this.$nextTick(() => this.$refs.search?.focus()); this.previousFocus = document.activeElement; },
  beforeDestroy() { this.previousFocus?.focus?.(); },
  methods: {
    onKeydown(event) {
      if (event.key === 'Escape') { event.preventDefault(); this.$emit('close'); }
      else if (event.key === 'Tab') {
        const focusable = Array.from(this.$refs.dialog.querySelectorAll('input:not([disabled]), button:not([disabled])'));
        const currentIndex = focusable.indexOf(document.activeElement);
        const nextIndex = event.shiftKey
          ? (currentIndex <= 0 ? focusable.length - 1 : currentIndex - 1)
          : (currentIndex === focusable.length - 1 ? 0 : currentIndex + 1);
        if (focusable.length) {
          event.preventDefault();
          focusable[nextIndex].focus();
        }
      }
      else if (event.key === 'ArrowDown' && this.filteredActions.length) { event.preventDefault(); this.activeIndex = Math.min(this.activeIndex + 1, this.filteredActions.length - 1); }
      else if (event.key === 'ArrowUp' && this.filteredActions.length) { event.preventDefault(); this.activeIndex = Math.max(this.activeIndex - 1, 0); }
      else if (event.key === 'Enter' && this.filteredActions[this.activeIndex]) { event.preventDefault(); this.activate(this.filteredActions[this.activeIndex]); }
    },
    optionId(index) { return `material-command-palette-option-${this._uid}-${index}`; },
    async activate(action) {
      if (typeof action.run === 'function') await action.run();
      this.$emit('select', action);
      this.$emit('close');
    },
  },
};
</script>

<style lang="scss" src="../shared-shell.scss"></style>
