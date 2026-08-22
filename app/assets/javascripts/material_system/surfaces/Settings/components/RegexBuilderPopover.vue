<template>
  <div
    ref="popover"
    class="st-regex-popover"
    role="dialog"
    aria-modal="false"
    :aria-label="`${corpusTitle} regex builder`"
    @keydown.esc="close"
  >
    <div class="st-regex-popover__header">
      <h2 class="st-regex-popover__title">Regex builder</h2>
      <button type="button" class="st-regex-popover__close" aria-label="Close regex builder" @click="close">
        <StIcon name="close" size="small" />
      </button>
    </div>

    <label class="st-regex-popover__label" :for="patternId">Pattern</label>
    <input
      :id="patternId"
      ref="patternInput"
      type="text"
      class="st-regex-popover__input"
      :value="pattern"
      placeholder="e.g. ^DEPLOY|main"
      :aria-invalid="!syntax.valid"
      @input="onPatternInput"
    />

    <fieldset class="st-regex-popover__flags">
      <legend class="st-regex-popover__label">Flags</legend>
      <label v-for="flag in availableFlags" :key="flag.value" class="st-regex-popover__flag">
        <input type="checkbox" :checked="flags.includes(flag.value)" @change="toggleFlag(flag.value)" />
        {{ flag.label }}
      </label>
    </fieldset>

    <p v-if="!syntax.valid" class="st-regex-popover__error" role="alert">{{ syntax.message }}</p>

    <div class="st-regex-popover__results">
      <p class="st-regex-popover__results-title">
        {{ corpusTitle }} — {{ matchCount }} of {{ corpus.length }} match{{ corpus.length === 1 ? '' : 'es' }}
      </p>
      <ul class="st-regex-popover__list">
        <li
          v-for="(line, index) in corpusPreview"
          :key="index"
          class="st-regex-popover__item"
          :class="{ 'st-regex-popover__item--match': line.matched }"
        >
          {{ line.text }}
        </li>
        <li v-if="corpus.length === 0" class="st-regex-popover__item st-regex-popover__item--empty">
          Nothing to search yet.
        </li>
      </ul>
    </div>

    <div class="st-regex-popover__actions">
      <button type="button" class="st-btn st-btn--text" @click="close">Cancel</button>
      <button type="button" class="st-btn st-btn--filled" :disabled="!pattern || !syntax.valid" @click="apply">
        Apply
      </button>
    </div>
  </div>
</template>

<script>
import StIcon from './StIcon.vue';
import { RegexBuilder } from '../../../regex-builder';

const AVAILABLE_FLAGS = [
  { value: 'i', label: 'Ignore case (i)' },
  { value: 'g', label: 'Global (g)' },
  { value: 'm', label: 'Multiline (m)' },
];

export default {
  name: 'RegexBuilderPopover',
  components: { StIcon },
  props: {
    initialPattern: { type: String, default: '' },
    corpus: { type: Array, default: () => [] },
    corpusTitle: { type: String, default: 'Matches' },
  },
  data() {
    const builder = new RegexBuilder({ pattern: this.initialPattern, flags: 'i', regex: true });
    return {
      builder,
      pattern: builder.state.pattern,
      flags: builder.state.flags,
      syntax: builder.state.syntax,
      availableFlags: AVAILABLE_FLAGS,
      patternId: `st-regex-pattern-${Math.random().toString(36).slice(2, 9)}`,
    };
  },
  computed: {
    matchExpression() {
      if (!this.syntax.valid || !this.pattern) return null;
      try {
        return new RegExp(this.pattern, this.flags.includes('i') ? this.flags : `${this.flags}i`);
      } catch (_error) {
        return null;
      }
    },
    corpusPreview() {
      const expression = this.matchExpression;
      return this.corpus
        .slice(0, 50)
        .map((text) => ({ text, matched: Boolean(this.pattern) && Boolean(expression) && expression.test(text) }));
    },
    matchCount() {
      if (!this.pattern) return this.corpus.length;
      const expression = this.matchExpression;
      if (!expression) return 0;
      return this.corpus.reduce((count, text) => count + (expression.test(text) ? 1 : 0), 0);
    },
  },
  mounted() {
    this.$nextTick(() => this.$refs.patternInput && this.$refs.patternInput.focus());
    document.addEventListener('mousedown', this.onOutsideClick, true);
  },
  beforeDestroy() {
    document.removeEventListener('mousedown', this.onOutsideClick, true);
  },
  methods: {
    onPatternInput(event) {
      const snapshot = this.builder.update({ pattern: event.target.value });
      this.pattern = snapshot.pattern;
      this.syntax = snapshot.syntax;
    },
    toggleFlag(flag) {
      const next = this.flags.includes(flag) ? this.flags.replace(flag, '') : this.flags + flag;
      const snapshot = this.builder.update({ flags: next });
      this.flags = snapshot.flags;
      this.syntax = snapshot.syntax;
    },
    apply() {
      if (!this.pattern || !this.syntax.valid) return;
      this.$emit('apply', this.pattern);
    },
    close() {
      this.$emit('close');
    },
    onOutsideClick(event) {
      if (this.$refs.popover && !this.$refs.popover.contains(event.target)) this.close();
    },
  },
};
</script>

<style lang="scss" scoped>
.st-regex-popover {
  position: absolute;
  top: calc(100% + 6px);
  left: 0;
  z-index: 30;
  width: min(360px, 90vw);
  background: var(--st-card);
  color: var(--st-onsurf);
  border: 1px solid var(--st-outlv);
  border-radius: 16px;
  box-shadow: var(--st-elevation-3);
  padding: 16px;
  max-height: min(420px, 70vh);
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.st-regex-popover__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.st-regex-popover__title {
  margin: 0;
  font-size: 14px;
  font-weight: 700;
}

.st-regex-popover__close {
  border: none;
  background: transparent;
  color: var(--st-onsurfv);
  cursor: pointer;
  width: 28px;
  height: 28px;
  border-radius: 999px;
  display: flex;
  align-items: center;
  justify-content: center;

  &:hover {
    background: var(--st-surfch);
  }
  &:focus-visible {
    outline: 2px solid var(--st-prim);
    outline-offset: 2px;
  }
}

.st-regex-popover__label {
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--st-onsurfv);
  padding: 0;
  border: 0;
}

.st-regex-popover__input {
  width: 100%;
  padding: 8px 12px;
  border-radius: var(--st-radius-field);
  border: 1px solid var(--st-outl);
  background: var(--st-surf);
  color: var(--st-onsurf);
  font: inherit;
  font-family: 'SFMono-Regular', Consolas, Menlo, monospace;

  &:focus-visible {
    outline: 2px solid var(--st-prim);
    outline-offset: 1px;
  }
}

.st-regex-popover__flags {
  display: flex;
  gap: 14px;
  flex-wrap: wrap;
  border: 0;
  padding: 0;
  margin: 0;
}

.st-regex-popover__flag {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12.5px;
  color: var(--st-onsurf);
}

.st-regex-popover__error {
  margin: 0;
  font-size: 12px;
  color: var(--st-err);
}

.st-regex-popover__results {
  border-top: 1px solid var(--st-outlv);
  padding-top: 8px;
}

.st-regex-popover__results-title {
  margin: 0 0 6px;
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--st-onsurfv);
}

.st-regex-popover__list {
  list-style: none;
  margin: 0;
  padding: 0;
  max-height: 140px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.st-regex-popover__item {
  font-size: 12.5px;
  padding: 4px 8px;
  border-radius: 8px;
  color: var(--st-onsurfv);
}

.st-regex-popover__item--match {
  background: var(--st-primc);
  color: var(--st-onprimc);
}

.st-regex-popover__item--empty {
  font-style: italic;
}

.st-regex-popover__actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}
</style>
