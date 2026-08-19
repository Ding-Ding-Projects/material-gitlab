<script>
// Faithful port of design/Regex Builder.dc.html, which is a shared cross-surface
// overlay owned by another lane and not yet present in this worktree. This copy
// lives inside the Repository surface only and reuses the shared RegexBuilder
// evaluation primitive rather than reimplementing pattern matching.
import RegexBuilder from '../../../regex-builder';

const FLAG_TIPS = { i: 'case-insensitive', g: 'global', m: 'multiline', s: 'dotall' };

const SNIPPET_GROUPS = [
  ['Classes', [['\\d', 'digit 0-9'], ['\\w', 'word char'], ['\\s', 'whitespace'], ['[a-z]', 'range'], ['[^ ]', 'not space'], ['.', 'any char']]],
  ['Quantifiers', [['*', 'zero+'], ['+', 'one+'], ['?', 'optional'], ['{2,5}', '2 to 5'], ['*?', 'lazy zero+'], ['+?', 'lazy one+']]],
  ['Anchors', [['^', 'line start'], ['$', 'line end'], ['\\b', 'word boundary'], ['\\B', 'non-boundary']]],
  ['Groups', [['( )', 'capture'], ['(?: )', 'non-capture'], ['(a|b)', 'alternation'], ['(?= )', 'lookahead'], ['(?! )', 'neg lookahead'], ['(?<= )', 'lookbehind']]],
  ['Recipes', [['#\\d+', 'ref number'], ['\\d{2}:\\d{2}', 'duration'], ['(fail|error)', 'failures'], ['^ERROR', 'error lines'], ['\\bretry\\w*', 'retry words']]],
];

const TOKEN_DICT = [
  ['(?:', 'non-capturing group'], ['(?=', 'lookahead'], ['(?!', 'negative lookahead'], ['(?<=', 'lookbehind'], ['(?<!', 'negative lookbehind'],
  ['(', 'capturing group'], [')', 'end group'], ['[^', 'negated class'], ['[', 'character class'], [']', 'end class'],
  ['\\d', 'digit'], ['\\D', 'non-digit'], ['\\w', 'word char'], ['\\W', 'non-word char'], ['\\s', 'whitespace'], ['\\S', 'non-whitespace'],
  ['\\b', 'word boundary'], ['\\B', 'non-boundary'], ['.*', 'any chars (greedy)'], ['.+', 'one or more chars'], ['.', 'any char'],
  ['*?', 'zero+ (lazy)'], ['+?', 'one+ (lazy)'], ['*', 'zero or more'], ['+', 'one or more'], ['??', 'optional (lazy)'], ['?', 'optional'],
  ['^', 'start anchor'], ['$', 'end anchor'], ['|', 'alternation'], ['{', 'repetition {n,m}'],
];

const DEFAULT_TEST_TEXT = 'auth: login failed for user 42\npipeline #8812 passed in 04:31\nERROR TokenRefresh retry_count=3';

export default {
  name: 'RegexBuilderDialog',
  props: {
    initialPattern: { type: String, default: '' },
    corpus: { type: Array, default: () => [] },
    corpusTitle: { type: String, default: 'Matches' },
  },
  data() {
    return {
      draft: this.initialPattern,
      flags: { i: true, g: true, m: false, s: false },
      testText: DEFAULT_TEST_TEXT,
    };
  },
  computed: {
    flagString() {
      return Object.keys(this.flags)
        .filter((flag) => this.flags[flag])
        .join('');
    },
    highlightFlags() {
      return this.flagString.includes('g') ? this.flagString : `${this.flagString}g`;
    },
    tester() {
      // Powers validity + corpus preview: a single-shot test against the pattern.
      return new RegexBuilder({ pattern: this.draft, flags: this.flagString, regex: true });
    },
    highlighter() {
      // Powers the test-text highlight + capture groups: always global so every
      // occurrence in the repository corpus is found, matching the design's own behavior.
      return new RegexBuilder({ pattern: this.draft, sample: this.testText, flags: this.highlightFlags, regex: true });
    },
    valid() {
      return this.tester.state.syntax.valid;
    },
    validLabel() {
      if (!this.valid) return 'invalid';
      return this.draft ? 'valid' : 'empty';
    },
    errorMessage() {
      return this.valid ? '' : this.highlighter.state.syntax.message;
    },
    flagChips() {
      return Object.keys(this.flags).map((flag) => ({ flag, tip: FLAG_TIPS[flag], active: this.flags[flag] }));
    },
    snippetGroups() {
      return SNIPPET_GROUPS.map(([name, items]) => ({
        name,
        items: items.map(([text, tip]) => ({ text, tip })),
      }));
    },
    matches() {
      if (!this.draft || !this.valid) return [];
      return this.highlighter.state.matches;
    },
    groups() {
      const first = this.matches[0];
      if (!first) return [];
      return Object.entries(first.groups || {}).length
        ? Object.entries(first.groups).map(([name, value]) => ({ n: name, val: value === undefined ? '—' : value }))
        : this.highlighter.state.captures[0]?.map((value, index) => ({ n: `$${index + 1}`, val: value === undefined ? '—' : value })) || [];
    },
    highlightSegments() {
      if (!this.draft || !this.valid || !this.matches.length) return [{ text: this.testText, mark: false }];
      const segments = [];
      let cursor = 0;
      this.matches.forEach((match) => {
        if (match.index > cursor) segments.push({ text: this.testText.slice(cursor, match.index), mark: false });
        segments.push({ text: match.value || '∅', mark: true });
        cursor = match.index + (match.value ? match.value.length : 1);
      });
      segments.push({ text: this.testText.slice(cursor), mark: false });
      return segments;
    },
    explanation() {
      const tokens = [];
      let rest = this.draft;
      while (rest.length && tokens.length < 24) {
        const hit = TOKEN_DICT.find(([token]) => rest.startsWith(token));
        if (hit) {
          tokens.push({ tok: hit[0], desc: hit[1] });
          rest = rest.slice(hit[0].length);
        } else {
          let literal = '';
          while (rest.length && !TOKEN_DICT.some(([token]) => rest.startsWith(token))) {
            literal += rest[0];
            rest = rest.slice(1);
          }
          if (literal) tokens.push({ tok: literal.slice(0, 8), desc: `literal "${literal}"` });
        }
      }
      return tokens;
    },
    corpusPreview() {
      if (!this.draft || !this.valid) return { items: [], countLabel: `0 of ${this.corpus.length}` };
      let expression;
      try {
        expression = new RegExp(this.draft, this.flagString);
      } catch (_error) {
        return { items: [], countLabel: `0 of ${this.corpus.length}` };
      }
      const matched = this.corpus.filter((entry) => {
        expression.lastIndex = 0;
        return expression.test(entry);
      });
      return { items: matched.slice(0, 5), countLabel: `${matched.length} of ${this.corpus.length}` };
    },
  },
  mounted() {
    this.$nextTick(() => this.$refs.patternInput && this.$refs.patternInput.focus());
  },
  methods: {
    toggleFlag(flag) {
      this.flags = { ...this.flags, [flag]: !this.flags[flag] };
    },
    insertSnippet(text) {
      this.draft += text.replace(/ /g, '');
      this.$refs.patternInput && this.$refs.patternInput.focus();
    },
    close() {
      this.$emit('close');
    },
    apply() {
      this.$emit('apply', this.draft);
    },
    stop(event) {
      event.stopPropagation();
    },
  },
};
</script>

<template>
  <div class="regex-scrim" role="presentation" @click="close" @keydown.esc="close">
    <div
      class="regex-dialog"
      role="dialog"
      aria-modal="true"
      aria-labelledby="regex-builder-title"
      @click="stop"
    >
      <div class="regex-dialog__head">
        <h2 id="regex-builder-title" class="regex-dialog__title">Regex builder</h2>
        <span class="regex-dialog__badge" :class="valid ? 'is-valid' : 'is-invalid'">{{ validLabel }}</span>
        <div class="regex-dialog__flags" role="group" aria-label="Regex flags">
          <button
            v-for="chip in flagChips"
            :key="chip.flag"
            type="button"
            class="flag-chip"
            :class="{ 'is-active': chip.active }"
            :aria-pressed="chip.active"
            :title="chip.tip"
            @click="toggleFlag(chip.flag)"
          >
            {{ chip.flag }}
          </button>
        </div>
      </div>

      <label class="visually-hidden" for="regex-pattern-input">Regular expression pattern</label>
      <input
        id="regex-pattern-input"
        ref="patternInput"
        v-model="draft"
        type="text"
        class="regex-dialog__pattern"
        placeholder="pattern, e.g. (auth|login).*fail"
        :aria-invalid="!valid"
        aria-describedby="regex-error"
      />
      <div v-if="errorMessage" id="regex-error" class="regex-dialog__error" role="alert">{{ errorMessage }}</div>

      <div class="snippet-groups">
        <div v-for="group in snippetGroups" :key="group.name" class="snippet-group">
          <span class="snippet-group__name">{{ group.name }}</span>
          <button
            v-for="item in group.items"
            :key="item.text"
            type="button"
            class="snippet-chip"
            :title="item.tip"
            @click="insertSnippet(item.text)"
          >
            {{ item.text }}
          </button>
        </div>
      </div>

      <div class="regex-dialog__grid">
        <div class="regex-panel">
          <span class="regex-panel__label">Test string</span>
          <textarea v-model="testText" rows="4" class="regex-dialog__test-text" aria-label="Test string"></textarea>
          <div class="highlight-box" aria-live="polite">
            <template v-for="(segment, index) in highlightSegments">
              <mark v-if="segment.mark" :key="`m-${index}`">{{ segment.text }}</mark>
              <span v-else :key="`t-${index}`">{{ segment.text }}</span>
            </template>
          </div>
        </div>
        <div class="regex-panel">
          <span class="regex-panel__label">Capture groups</span>
          <div class="regex-box">
            <div v-for="group in groups" :key="group.n" class="capture-row">
              <span class="capture-row__name">{{ group.n }}</span>
              <span class="capture-row__value">{{ group.val }}</span>
            </div>
            <p v-if="!groups.length" class="regex-box__empty">No captures on first match.</p>
          </div>
          <span class="regex-panel__label">Explanation</span>
          <div class="regex-box regex-box--scroll">
            <div v-for="(token, index) in explanation" :key="index" class="explain-row">
              <span class="explain-row__token">{{ token.tok }}</span>
              <span class="explain-row__desc">{{ token.desc }}</span>
            </div>
          </div>
        </div>
      </div>

      <div class="corpus-box">
        <div class="corpus-box__label">{{ corpusTitle }} &middot; {{ corpusPreview.countLabel }}</div>
        <div class="corpus-box__list">
          <div v-for="(item, index) in corpusPreview.items" :key="index" class="corpus-box__item">{{ item }}</div>
          <p v-if="draft && valid && !corpusPreview.items.length" class="regex-box__empty">No matches in {{ corpusTitle.toLowerCase() }}.</p>
        </div>
      </div>

      <div class="regex-dialog__actions">
        <button type="button" class="btn-text" @click="close">Cancel</button>
        <button type="button" class="btn-filled" :disabled="!valid || !draft" @click="apply">Apply to search</button>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
@import '../repository.scss';

.regex-scrim {
  position: fixed;
  inset: 0;
  background: var(--scrim);
  z-index: 70;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
}

.regex-dialog {
  @include overlay-surface(28px);
  @include thin-scrollbar;
  @include reduced-motion;

  width: min(780px, 100%);
  max-height: 88vh;
  overflow-y: auto;
  padding: 26px;
  display: flex;
  flex-direction: column;
  gap: 14px;
  font-family: $font-stack;
  color: var(--onsurf);
}

.regex-dialog__head {
  display: flex;
  align-items: center;
  gap: 12px;
}

.regex-dialog__title {
  margin: 0;
  font-size: 20px;
  font-weight: 500;
}

.regex-dialog__badge {
  font-size: 12px;
  font-weight: 500;
  padding: 3px 12px;
  border-radius: 999px;

  &.is-valid {
    background: var(--goodc);
    color: var(--good);
  }
  &.is-invalid {
    background: var(--errc);
    color: var(--err);
  }
}

.regex-dialog__flags {
  margin-left: auto;
  display: flex;
  gap: 4px;
}

.flag-chip {
  @include focus-ring;
  font-family: monospace;
  font-size: 13px;
  font-weight: 700;
  width: 32px;
  height: 32px;
  border: none;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  background: var(--surfc);
  color: var(--onsurfv);

  &.is-active {
    background: var(--prim);
    color: var(--onprim);
  }
}

.regex-dialog__pattern {
  @include focus-ring;
  border: 1px solid var(--outl);
  border-radius: 12px;
  padding: 12px 14px;
  font-family: monospace;
  font-size: 15px;
  background: transparent;
  color: var(--onsurf);
  outline: none;
  width: 100%;
  box-sizing: border-box;
}

.regex-dialog__error {
  font-size: 12.5px;
  color: var(--err);
  font-family: monospace;
}

.snippet-groups {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.snippet-group {
  display: flex;
  align-items: baseline;
  gap: 8px;
  flex-wrap: wrap;
}

.snippet-group__name {
  font-size: 11px;
  font-weight: 700;
  color: var(--onsurfv);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  width: 86px;
  flex-shrink: 0;
}

.snippet-chip {
  @include focus-ring;
  font-family: monospace;
  font-size: 12.5px;
  padding: 5px 11px;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  background: var(--surfc);
  color: var(--onsurf);

  &:hover {
    background: var(--surfch);
  }
}

.regex-dialog__grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;

  @media (max-width: 620px) {
    grid-template-columns: 1fr;
  }
}

.regex-panel {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.regex-panel__label {
  font-size: 11.5px;
  font-weight: 700;
  color: var(--onsurfv);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.regex-dialog__test-text {
  @include focus-ring;
  border: 1px solid var(--outl);
  border-radius: 12px;
  padding: 10px 12px;
  font-family: monospace;
  font-size: 12.5px;
  background: transparent;
  color: var(--onsurf);
  outline: none;
  resize: vertical;
}

.highlight-box {
  background: var(--surfcl);
  border-radius: 12px;
  padding: 10px 12px;
  font-family: monospace;
  font-size: 12.5px;
  line-height: 1.7;
  min-height: 40px;
  word-break: break-word;
  white-space: pre-wrap;

  ::v-deep mark {
    background: var(--primc);
    color: var(--onprimc);
    border-radius: 3px;
    padding: 0 1px;
  }
}

.regex-box {
  background: var(--surfcl);
  border-radius: 12px;
  padding: 10px 12px;
  min-height: 40px;
  display: flex;
  flex-direction: column;
  gap: 4px;

  &--scroll {
    max-height: 120px;
    overflow-y: auto;
  }
}

.regex-box__empty {
  margin: 0;
  font-size: 12px;
  color: var(--onsurfv);
}

.capture-row,
.explain-row {
  display: flex;
  gap: 10px;
  font-size: 12.5px;
}

.capture-row__name {
  font-family: monospace;
  color: var(--onprimc);
  font-weight: 700;
  width: 36px;
  flex-shrink: 0;
}

.explain-row__token {
  font-family: monospace;
  color: var(--onprimc);
  flex-shrink: 0;
  min-width: 52px;
}

.explain-row__desc {
  color: var(--onsurfv);
  font-size: 12px;
}

.corpus-box {
  background: var(--surfcl);
  border-radius: 14px;
  padding: 12px 14px;
  min-height: 50px;
}

.corpus-box__label {
  font-size: 11.5px;
  font-weight: 700;
  color: var(--onsurfv);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 8px;
}

.corpus-box__list {
  max-height: 120px;
  overflow-y: auto;
}

.corpus-box__item {
  font-size: 12.5px;
  padding: 3px 0;
  color: var(--onsurfv);
  font-family: monospace;
}

.regex-dialog__actions {
  display: flex;
  gap: 10px;
  justify-content: flex-end;
}

.btn-text {
  @include focus-ring;
  padding: 10px 20px;
  border-radius: 999px;
  font-size: 13.5px;
  cursor: pointer;
  color: var(--onprimc);
  background: none;
  border: none;
}

.btn-filled {
  @include focus-ring;
  padding: 10px 22px;
  border-radius: 999px;
  font-size: 13.5px;
  font-weight: 500;
  cursor: pointer;
  background: var(--prim);
  color: var(--onprim);
  border: none;

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
}

.visually-hidden {
  @include visually-hidden;
}
</style>
