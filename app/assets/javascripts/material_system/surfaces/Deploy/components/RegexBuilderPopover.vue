<template>
  <div
    ref="popover"
    class="dp-regex-popover"
    role="dialog"
    aria-modal="false"
    :aria-label="`${corpusTitle} regex builder`"
    @keydown.esc="close"
  >
    <div class="dp-regex-popover__header">
      <h2 class="dp-regex-popover__title">Regex builder</h2>
      <button type="button" class="dp-regex-popover__close" aria-label="Close regex builder" @click="close">
        <DpIcon name="close" size="small" />
      </button>
    </div>

    <label class="dp-regex-popover__label" :for="patternId">Pattern</label>
    <input
      :id="patternId"
      ref="patternInput"
      type="text"
      class="dp-regex-popover__input"
      :value="pattern"
      placeholder="e.g. ^v17\.[0-9]+\.0$"
      :aria-invalid="!syntax.valid"
      @input="onPatternInput"
    />

    <fieldset class="dp-regex-popover__flags">
      <legend class="dp-regex-popover__label">Flags</legend>
      <label v-for="flag in availableFlags" :key="flag.value" class="dp-regex-popover__flag">
        <input type="checkbox" :checked="flags.includes(flag.value)" @change="toggleFlag(flag.value)" />
        {{ flag.label }}
      </label>
    </fieldset>

    <p v-if="!syntax.valid" class="dp-regex-popover__error" role="alert">{{ syntax.message }}</p>

    <div class="dp-regex-popover__results">
      <p class="dp-regex-popover__results-title">
        {{ corpusTitle }} — {{ matchCount }} of {{ corpus.length }} match{{ corpus.length === 1 ? '' : 'es' }}
      </p>
      <ul class="dp-regex-popover__list">
        <li
          v-for="(line, index) in corpusPreview"
          :key="index"
          class="dp-regex-popover__item"
          :class="{ 'dp-regex-popover__item--match': line.matched }"
        >
          {{ line.text }}
        </li>
        <li v-if="corpus.length === 0" class="dp-regex-popover__item dp-regex-popover__item--empty">
          Nothing to search yet.
        </li>
      </ul>
    </div>

    <div class="dp-regex-popover__actions">
      <button type="button" class="dp-btn dp-btn--text" @click="close">Cancel</button>
      <button type="button" class="dp-btn dp-btn--filled" :disabled="!pattern || !syntax.valid" @click="apply">
        Apply
      </button>
    </div>
  </div>
</template>

<script>
import DpIcon from './DpIcon.vue';
import { RegexBuilder } from '../../../regex-builder';

const AVAILABLE_FLAGS = [
  { value: 'i', label: 'Ignore case (i)' },
  { value: 'g', label: 'Global (g)' },
  { value: 'm', label: 'Multiline (m)' },
];

export default {
  name: 'RegexBuilderPopover',
  components: { DpIcon },
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
      patternId: `dp-regex-pattern-${Math.random().toString(36).slice(2, 9)}`,
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
.dp-regex-popover {
  position: absolute;
  top: calc(100% + 6px);
  left: 0;
  right: 0;
  z-index: 30;
  background: var(--dp-card);
  color: var(--dp-onsurf);
  border: 1px solid var(--dp-outlv);
  border-radius: 16px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.22);
  padding: 16px;
  max-height: min(420px, 70vh);
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.dp-regex-popover__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.dp-regex-popover__title {
  margin: 0;
  font-size: 14px;
  font-weight: 700;
}

.dp-regex-popover__close {
  border: none;
  background: transparent;
  color: var(--dp-onsurfv);
  cursor: pointer;
  width: 28px;
  height: 28px;
  border-radius: 999px;
  display: flex;
  align-items: center;
  justify-content: center;

  &:hover {
    background: var(--dp-surfch);
  }
  &:focus-visible {
    outline: 2px solid var(--dp-prim);
    outline-offset: 2px;
  }
}

.dp-regex-popover__label {
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--dp-onsurfv);
  padding: 0;
  border: 0;
}

.dp-regex-popover__input {
  width: 100%;
  padding: 8px 12px;
  border-radius: 12px;
  border: 1px solid var(--dp-outl);
  background: var(--dp-surf);
  color: var(--dp-onsurf);
  font: inherit;
  font-family: 'SFMono-Regular', Consolas, Menlo, monospace;

  &:focus-visible {
    outline: 2px solid var(--dp-prim);
    outline-offset: 1px;
  }
}

.dp-regex-popover__flags {
  display: flex;
  gap: 14px;
  flex-wrap: wrap;
  border: 0;
  padding: 0;
  margin: 0;
}

.dp-regex-popover__flag {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12.5px;
  color: var(--dp-onsurf);
}

.dp-regex-popover__error {
  margin: 0;
  font-size: 12px;
  color: var(--dp-err);
}

.dp-regex-popover__results {
  border-top: 1px solid var(--dp-outlv);
  padding-top: 8px;
}

.dp-regex-popover__results-title {
  margin: 0 0 6px;
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--dp-onsurfv);
}

.dp-regex-popover__list {
  list-style: none;
  margin: 0;
  padding: 0;
  max-height: 140px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.dp-regex-popover__item {
  font-size: 12.5px;
  padding: 4px 8px;
  border-radius: 8px;
  color: var(--dp-onsurfv);
}

.dp-regex-popover__item--match {
  background: var(--dp-primc);
  color: var(--dp-onprimc);
}

.dp-regex-popover__item--empty {
  font-style: italic;
}

.dp-regex-popover__actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

.dp-btn {
  border-radius: 999px;
  padding: 8px 16px;
  font: inherit;
  font-weight: 600;
  font-size: 13px;
  cursor: pointer;
  border: none;

  &:focus-visible {
    outline: 2px solid var(--dp-prim);
    outline-offset: 2px;
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
}

.dp-btn--text {
  background: transparent;
  color: var(--dp-onsurfv);

  &:hover:not(:disabled) {
    background: var(--dp-surfch);
  }
}

.dp-btn--filled {
  background: var(--dp-prim);
  color: var(--dp-onprim);

  &:hover:not(:disabled) {
    filter: brightness(1.06);
  }
}
</style>
