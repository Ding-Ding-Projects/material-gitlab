<template>
  <div class="gl-code-overlay" @click.self="$emit('close')">
    <div
      class="gl-code-dialog gl-code-dialog--regex"
      role="dialog"
      aria-modal="true"
      aria-labelledby="gl-code-regex-title"
      @keydown.esc="$emit('close')"
    >
      <div class="gl-code-dialog__head">
        <h2 id="gl-code-regex-title" class="gl-code-dialog__title">Regex builder</h2>
        <span
          class="gl-code-status-chip"
          :style="{ background: valid ? 'var(--goodc)' : 'var(--errc)', color: valid ? 'var(--good)' : 'var(--err)' }"
        >{{ validLabel }}</span>
        <div class="gl-code-flagchips">
          <button
            v-for="chip in flagChips"
            :key="chip.name"
            type="button"
            class="gl-code-flagchip"
            :class="{ 'is-active': flags[chip.name] }"
            :title="chip.tip"
            :aria-pressed="flags[chip.name] ? 'true' : 'false'"
            @click="toggleFlag(chip.name)"
          >{{ chip.name }}</button>
        </div>
      </div>

      <label class="gl-code-visually-hidden" for="gl-code-regex-draft">Regex pattern</label>
      <input
        id="gl-code-regex-draft"
        class="gl-code-mono-input"
        :value="draft"
        placeholder="pattern, e.g. (auth|login).*fail"
        @input="setDraft($event.target.value)"
      >
      <div v-if="errorMsg" class="gl-code-error">{{ errorMsg }}</div>

      <div class="gl-code-snippet-groups">
        <div v-for="group in snippetGroups" :key="group.name" class="gl-code-snippet-group">
          <span class="gl-code-snippet-group__label">{{ group.name }}</span>
          <button
            v-for="item in group.items"
            :key="item.text"
            type="button"
            class="gl-code-snippet-chip"
            :title="item.tip"
            @click="insertSnippet(item.text)"
          >{{ item.text }}</button>
        </div>
      </div>

      <div class="gl-code-grid-2">
        <div>
          <div class="gl-code-field-label">Test string</div>
          <label class="gl-code-visually-hidden" for="gl-code-regex-test">Test string</label>
          <textarea
            id="gl-code-regex-test"
            class="gl-code-textarea"
            rows="4"
            :value="testText"
            @input="setTestText($event.target.value)"
          />
          <div class="gl-code-panel gl-code-highlight" style="margin-top:8px">
            <span
              v-for="(part, idx) in highlightedParts"
              :key="idx"
              :class="{ 'gl-code-match': part.isMatch }"
            >{{ part.text }}</span>
          </div>
        </div>
        <div>
          <div class="gl-code-field-label">Capture groups</div>
          <div class="gl-code-panel gl-code-captures">
            <div v-for="g in captures" :key="g.n" class="gl-code-capture">
              <span class="gl-code-capture__n">{{ g.n }}</span><span>{{ g.val }}</span>
            </div>
            <div v-if="!captures.length" style="font-size:12px;color:var(--onsurfv)">No captures on first match.</div>
          </div>
          <div class="gl-code-field-label" style="margin-top:8px">Explanation</div>
          <div class="gl-code-panel gl-code-explain">
            <div v-for="(ex, idx) in explanation" :key="idx" class="gl-code-explain__row">
              <span class="gl-code-explain__tok">{{ ex.tok }}</span><span style="color:var(--onsurfv)">{{ ex.desc }}</span>
            </div>
          </div>
        </div>
      </div>

      <div class="gl-code-corpus">
        <div class="gl-code-corpus__title">{{ corpusTitle }} · {{ matchCount }}</div>
        <div v-for="(item, idx) in preview" :key="idx" class="gl-code-corpus__item">{{ item }}</div>
      </div>

      <div class="gl-code-dialog__actions">
        <button type="button" class="gl-code-btn gl-code-btn--text" @click="$emit('close')">Cancel</button>
        <button type="button" class="gl-code-btn" :disabled="!draft || !valid" @click="apply">Apply to search</button>
      </div>
    </div>
  </div>
</template>

<script>
import RegexBuilder from '../../../regex-builder';

const EXPLAIN_DICTIONARY = [
  ['(?:', 'non-capturing group'], ['(?=', 'lookahead'], ['(?!', 'negative lookahead'],
  ['(?<=', 'lookbehind'], ['(?<!', 'negative lookbehind'], ['(', 'capturing group'], [')', 'end group'],
  ['[^', 'negated class'], ['[', 'character class'], [']', 'end class'],
  ['\\d', 'digit'], ['\\D', 'non-digit'], ['\\w', 'word char'], ['\\W', 'non-word char'],
  ['\\s', 'whitespace'], ['\\S', 'non-whitespace'], ['\\b', 'word boundary'], ['\\B', 'non-boundary'],
  ['.*', 'any chars (greedy)'], ['.+', 'one or more chars'], ['.', 'any char'],
  ['*?', 'zero+ (lazy)'], ['+?', 'one+ (lazy)'], ['*', 'zero or more'], ['+', 'one or more'],
  ['??', 'optional (lazy)'], ['?', 'optional'], ['^', 'start anchor'], ['$', 'end anchor'],
  ['|', 'alternation'], ['{', 'repetition {n,m}'],
];

const SNIPPET_GROUPS = [
  ['Classes', [['\\d', 'digit 0-9'], ['\\w', 'word char'], ['\\s', 'whitespace'], ['[a-z]', 'range'], ['[^ ]', 'not space'], ['.', 'any char']]],
  ['Quantifiers', [['*', 'zero+'], ['+', 'one+'], ['?', 'optional'], ['{2,5}', '2 to 5'], ['*?', 'lazy zero+'], ['+?', 'lazy one+']]],
  ['Anchors', [['^', 'line start'], ['$', 'line end'], ['\\b', 'word boundary'], ['\\B', 'non-boundary']]],
  ['Groups', [['( )', 'capture'], ['(?: )', 'non-capture'], ['(a|b)', 'alternation'], ['(?= )', 'lookahead'], ['(?! )', 'neg lookahead'], ['(?<= )', 'lookbehind']]],
  ['Recipes', [['#\\d+', 'ref number'], ['\\d{2}:\\d{2}', 'duration'], ['(fail|error)', 'failures'], ['^ERROR', 'error lines'], ['\\bretry\\w*', 'retry words']]],
];

const FLAG_TIPS = { i: 'case-insensitive', g: 'global', m: 'multiline', s: 'dotall' };

/** Walks a pattern left-to-right, tagging known tokens and grouping the rest as literals. */
function explainPattern(pattern) {
  const explain = [];
  let rest = pattern;
  while (rest.length && explain.length < 24) {
    const hit = EXPLAIN_DICTIONARY.find(([token]) => rest.startsWith(token));
    if (hit) {
      explain.push({ tok: hit[0], desc: hit[1] });
      rest = rest.slice(hit[0].length);
    } else {
      let literal = '';
      while (rest.length && !EXPLAIN_DICTIONARY.some(([token]) => rest.startsWith(token))) {
        literal += rest[0];
        rest = rest.slice(1);
      }
      if (literal) explain.push({ tok: literal.slice(0, 8), desc: `literal "${literal}"` });
    }
  }
  return explain;
}

export default {
  name: 'RegexBuilderPopover',
  props: {
    initial: { type: String, default: '' },
    corpus: { type: Array, default: () => [] },
    corpusTitle: { type: String, default: 'Matches' },
  },
  data() {
    return {
      draft: this.initial,
      flags: { i: true, g: true, m: false, s: false },
      testText: 'auth: login failed for user 42\npipeline #8812 passed in 04:31\nERROR TokenRefresh retry_count=3',
      evaluation: null,
    };
  },
  computed: {
    flagsString() {
      return ['i', 'g', 'm', 's'].filter((f) => this.flags[f]).join('');
    },
    flagChips() {
      return ['i', 'g', 'm', 's'].map((name) => ({ name, tip: FLAG_TIPS[name] }));
    },
    valid() {
      return this.evaluation ? this.evaluation.syntax.valid : true;
    },
    errorMsg() {
      return this.evaluation && !this.evaluation.syntax.valid ? this.evaluation.syntax.message : '';
    },
    validLabel() {
      if (!this.valid) return 'invalid';
      return this.draft ? 'valid' : 'empty';
    },
    highlightedParts() {
      if (!this.evaluation || !this.draft || !this.valid || !this.evaluation.matches.length) {
        return [{ text: this.testText, isMatch: false }];
      }
      const parts = [];
      let cursor = 0;
      this.evaluation.matches.forEach((match) => {
        if (match.index > cursor) parts.push({ text: this.testText.slice(cursor, match.index), isMatch: false });
        parts.push({ text: match.value || '∅', isMatch: true });
        cursor = match.index + (match.value ? match.value.length : 1);
      });
      if (cursor < this.testText.length) parts.push({ text: this.testText.slice(cursor), isMatch: false });
      return parts;
    },
    captures() {
      const first = this.evaluation && this.evaluation.captures[0];
      if (!first) return [];
      return first.map((value, idx) => ({ n: `$${idx + 1}`, val: value === undefined ? '—' : value }));
    },
    explanation() {
      return this.draft ? explainPattern(this.draft) : [];
    },
    preview() {
      if (!this.draft || !this.valid) return [];
      try {
        const re = new RegExp(this.draft, this.flagsString);
        return this.corpus.filter((text) => { re.lastIndex = 0; return re.test(text); }).slice(0, 5);
      } catch (_error) {
        return [];
      }
    },
    matchCount() {
      return `${this.preview.length} of ${this.corpus.length}`;
    },
    snippetGroups() {
      return SNIPPET_GROUPS.map(([name, items]) => ({
        name,
        items: items.map(([text, tip]) => ({ text, tip })),
      }));
    },
  },
  created() {
    this.builder = new RegexBuilder({ pattern: this.draft, sample: this.testText, flags: this.flagsString, regex: true });
    this.recompute();
  },
  methods: {
    recompute() {
      this.evaluation = this.builder.update({
        pattern: this.draft,
        sample: this.testText,
        flags: this.flagsString,
        regex: true,
      });
    },
    setDraft(value) {
      this.draft = value;
      this.recompute();
    },
    setTestText(value) {
      this.testText = value;
      this.recompute();
    },
    toggleFlag(name) {
      this.flags = { ...this.flags, [name]: !this.flags[name] };
      this.recompute();
    },
    insertSnippet(text) {
      this.draft += text.replace(/ /g, '');
      this.recompute();
    },
    apply() {
      if (!this.draft || !this.valid) return;
      this.$emit('apply', this.draft);
    },
  },
};
</script>

<style lang="scss" scoped>
.gl-code-visually-hidden {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0 0 0 0);
  white-space: nowrap;
}
</style>
