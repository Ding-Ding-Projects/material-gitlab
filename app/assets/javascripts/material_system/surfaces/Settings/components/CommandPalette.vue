<template>
  <div class="st-scrim" @mousedown.self="close">
    <div ref="palette" class="st-palette" role="dialog" aria-modal="true" aria-label="Command palette" @keydown.esc="close">
      <SearchField
        ref="search"
        :value="query"
        placeholder="Search settings commands"
        label="Search commands"
        :regex-mode="regexMode"
        :regex-open="regexOpen"
        :valid="matcher.valid"
        :error="matcher.error"
        :corpus="actions.map((action) => action.label)"
        corpus-title="Commands"
        @input="onQuery"
        @toggle-regex="regexMode = !regexMode"
        @toggle-builder="regexOpen = !regexOpen"
        @apply-regex="onApplyRegex"
      />
      <ul class="st-palette__list" role="listbox" aria-label="Available commands">
        <li
          v-for="(action, index) in filteredActions"
          :key="action.id"
          role="option"
          class="st-palette__item"
          :class="{ 'st-palette__item--active': index === activeIndex }"
          :aria-selected="index === activeIndex"
          @mousemove="activeIndex = index"
          @click="run(action)"
        >
          <StIcon :name="action.icon" size="small" />
          {{ action.label }}
        </li>
        <li v-if="filteredActions.length === 0" class="st-palette__empty">No commands match your search.</li>
      </ul>
    </div>
  </div>
</template>

<script>
import StIcon from './StIcon.vue';
import SearchField from './SearchField.vue';
import { createMatcher } from '../data';

export default {
  name: 'CommandPalette',
  components: { StIcon, SearchField },
  props: {
    actions: { type: Array, required: true },
  },
  data() {
    return { query: '', regexMode: false, regexOpen: false, activeIndex: 0 };
  },
  computed: {
    matcher() {
      return createMatcher(this.query, { regexMode: this.regexMode });
    },
    filteredActions() {
      return this.actions.filter((action) => this.matcher.test(action.label));
    },
  },
  mounted() {
    this.$nextTick(() => this.$refs.search && this.$refs.search.focus());
    document.addEventListener('keydown', this.onGlobalKeydown, true);
  },
  beforeDestroy() {
    document.removeEventListener('keydown', this.onGlobalKeydown, true);
  },
  methods: {
    onQuery(value) {
      this.query = value;
      this.activeIndex = 0;
    },
    onApplyRegex(pattern) {
      this.query = pattern;
      this.regexMode = true;
      this.regexOpen = false;
    },
    onGlobalKeydown(event) {
      if (event.key === 'ArrowDown') {
        event.preventDefault();
        this.activeIndex = Math.min(this.activeIndex + 1, this.filteredActions.length - 1);
      } else if (event.key === 'ArrowUp') {
        event.preventDefault();
        this.activeIndex = Math.max(this.activeIndex - 1, 0);
      } else if (event.key === 'Enter' && this.filteredActions[this.activeIndex]) {
        event.preventDefault();
        this.run(this.filteredActions[this.activeIndex]);
      }
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

<style lang="scss" scoped>
.st-scrim {
  position: fixed;
  inset: 0;
  background: var(--st-scrim);
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding: 12vh 16px 16px;
  z-index: 100;
}

.st-palette {
  width: min(520px, 100%);
  max-height: min(70vh, 520px);
  background: var(--st-card);
  color: var(--st-onsurf);
  border-radius: 20px;
  box-shadow: var(--st-elevation-3);
  padding: 14px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  overflow: hidden;
}

.st-palette__list {
  list-style: none;
  margin: 0;
  padding: 0;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.st-palette__item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border-radius: 10px;
  font-size: 13.5px;
  cursor: pointer;
  color: var(--st-onsurfv);

  &--active {
    background: var(--st-surfch);
    color: var(--st-onsurf);
  }
}

.st-palette__empty {
  padding: 14px 12px;
  font-size: 13px;
  font-style: italic;
  color: var(--st-onsurfv);
}
</style>
