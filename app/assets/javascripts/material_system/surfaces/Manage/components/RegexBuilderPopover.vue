<template>
  <div
    ref="popover"
    class="mg-regex-popover"
    role="dialog"
    aria-modal="false"
    :aria-label="`${corpusTitle} regex builder`"
    @keydown.esc="close"
  >
    <div class="mg-regex-popover__header">
      <h2 class="mg-regex-popover__title">Regex builder</h2>
      <button type="button" class="mg-regex-popover__close" aria-label="Close regex builder" @click="close">
        <MgIcon name="close" size="small" />
      </button>
    </div>

    <label class="mg-regex-popover__label" :for="patternId">Pattern</label>
    <input
      :id="patternId"
      ref="patternInput"
      type="text"
      class="mg-regex-popover__input"
      :value="pattern"
      placeholder="e.g. ^bug|perf"
      :aria-invalid="!syntax.valid"
      @input="onPatternInput"
    />

    <fieldset class="mg-regex-popover__flags">
      <legend class="mg-regex-popover__label">Flags</legend>
      <label v-for="flag in availableFlags" :key="flag.value" class="mg-regex-popover__flag">
        <input type="checkbox" :checked="flags.includes(flag.value)" @change="toggleFlag(flag.value)" />
        {{ flag.label }}
      </label>
    </fieldset>

    <p v-if="!syntax.valid" class="mg-regex-popover__error" role="alert">{{ syntax.message }}</p>

    <div class="mg-regex-popover__results">
      <p class="mg-regex-popover__results-title">
        {{ corpusTitle }} — {{ matchCount }} of {{ corpus.length }} match{{ corpus.length === 1 ? '' : 'es' }}
      </p>
      <ul class="mg-regex-popover__list">
        <li
          v-for="(line, index) in corpusPreview"
          :key="index"
          class="mg-regex-popover__item"
          :class="{ 'mg-regex-popover__item--match': line.matched }"
        >
          {{ line.text }}
        </li>
        <li v-if="corpus.length === 0" class="mg-regex-popover__item mg-regex-popover__item--empty">
          Nothing to search yet.
        </li>
      </ul>
    </div>

    <div class="mg-regex-popover__actions">
      <button type="button" class="mg-btn mg-btn--text" @click="close">Cancel</button>
      <button type="button" class="mg-btn mg-btn--filled" :disabled="!pattern || !syntax.valid" @click="apply">
        Apply
      </button>
    </div>
  </div>
</template>

<script>
import MgIcon from './MgIcon.vue';
import { RegexBuilder } from '../../../regex-builder';

// Only "i" is offered: each corpus entry is matched independently with .test(), so
// "g" (repeat matches within one string) and "m" (multiline anchors) have no observable
// effect here and would mislead the preview about what the applied search actually does.
const AVAILABLE_FLAGS = [{ value: 'i', label: 'Ignore case (i)' }];

export default {
  name: 'RegexBuilderPopover',
  components: { MgIcon },
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
      patternId: `mg-regex-pattern-${Math.random().toString(36).slice(2, 9)}`,
    };
  },
  computed: {
    matchExpression() {
      // Mirrors exactly what gets applied once the search is committed (createSearchMatcher
      // in data.js), so the preview never promises matches the applied search won't honor.
      if (!this.syntax.valid || !this.pattern) return null;
      try {
        return new RegExp(this.pattern, this.flags);
      } catch (_error) {
        return null;
      }
    },
    corpusPreview() {
      const expression = this.matchExpression;
      return this.corpus.slice(0, 50).map((text) => ({ text, matched: Boolean(this.pattern) && Boolean(expression) && expression.test(text) }));
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
.mg-regex-popover {
  position: absolute;
  top: calc(100% + 6px);
  left: 0;
  right: 0;
  z-index: 30;
  background: var(--mg-card);
  color: var(--mg-onsurf);
  border: 1px solid var(--mg-outlv);
  border-radius: 16px;
  box-shadow: var(--mg-elevation-3);
  padding: 16px;
  // The surface root clips overflow, so this must stay well inside the viewport
  // rather than merely under an arbitrary px/vh cap.
  max-height: min(420px, calc(100vh - 120px));
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.mg-regex-popover__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.mg-regex-popover__title {
  margin: 0;
  font-size: 14px;
  font-weight: 700;
}

.mg-regex-popover__close {
  border: none;
  background: transparent;
  color: var(--mg-onsurfv);
  cursor: pointer;
  width: 28px;
  height: 28px;
  border-radius: 999px;
  display: flex;
  align-items: center;
  justify-content: center;

  &:hover {
    background: var(--mg-surfch);
  }
  &:focus-visible {
    outline: 2px solid var(--mg-prim);
    outline-offset: 2px;
  }
}

.mg-regex-popover__label {
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--mg-onsurfv);
  padding: 0;
  border: 0;
}

.mg-regex-popover__input {
  width: 100%;
  padding: 8px 12px;
  border-radius: var(--mg-radius-field);
  border: 1px solid var(--mg-outl);
  background: var(--mg-surf);
  color: var(--mg-onsurf);
  font: inherit;
  font-family: 'SFMono-Regular', Consolas, Menlo, monospace;

  &:focus-visible {
    outline: 2px solid var(--mg-prim);
    outline-offset: 1px;
  }
}

.mg-regex-popover__flags {
  display: flex;
  gap: 14px;
  flex-wrap: wrap;
}

.mg-regex-popover__flag {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12.5px;
  color: var(--mg-onsurf);
}

.mg-regex-popover__error {
  margin: 0;
  font-size: 12px;
  color: var(--mg-err);
}

.mg-regex-popover__results {
  border-top: 1px solid var(--mg-outlv);
  padding-top: 8px;
}

.mg-regex-popover__results-title {
  margin: 0 0 6px;
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--mg-onsurfv);
}

.mg-regex-popover__list {
  list-style: none;
  margin: 0;
  padding: 0;
  max-height: 140px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.mg-regex-popover__item {
  font-size: 12.5px;
  padding: 4px 8px;
  border-radius: 8px;
  color: var(--mg-onsurfv);
}

.mg-regex-popover__item--match {
  background: var(--mg-primc);
  color: var(--mg-onprimc);
}

.mg-regex-popover__item--empty {
  font-style: italic;
}

.mg-regex-popover__actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

.mg-btn {
  border-radius: var(--mg-radius-pill);
  padding: 8px 16px;
  font: inherit;
  font-weight: 600;
  font-size: 13px;
  cursor: pointer;
  border: none;

  &:focus-visible {
    outline: 2px solid var(--mg-prim);
    outline-offset: 2px;
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
}

.mg-btn--text {
  background: transparent;
  color: var(--mg-onsurfv);

  &:hover:not(:disabled) {
    background: var(--mg-surfch);
  }
}

.mg-btn--filled {
  background: var(--mg-prim);
  color: var(--mg-onprim);

  &:hover:not(:disabled) {
    filter: brightness(1.06);
  }
}
</style>
