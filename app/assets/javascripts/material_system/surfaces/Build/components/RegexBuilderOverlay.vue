<template>
  <div class="rb-scrim" @mousedown.self="close">
    <div
      ref="dialog"
      class="rb-dialog"
      role="dialog"
      aria-modal="true"
      :aria-labelledby="titleId"
      @keydown.esc.stop="close"
    >
      <div class="rb-dialog__header">
        <h2 :id="titleId" class="rb-dialog__title">Regex builder</h2>
        <span class="rb-chip" :class="validState.cls">{{ validState.label }}</span>
        <div class="rb-flags">
          <button
            v-for="flag in flagChips"
            :key="flag.name"
            type="button"
            class="rb-flag"
            :class="{ 'rb-flag--on': flag.on }"
            :aria-pressed="flag.on"
            :title="flag.tip"
            @click="toggleFlag(flag.name)"
          >{{ flag.name }}</button>
        </div>
        <button type="button" class="icon-btn" aria-label="Close regex builder" @click="close">
          <icon name="close" />
        </button>
      </div>

      <label class="rb-field">
        <span class="visually-hidden">Pattern</span>
        <input
          ref="patternInput"
          v-model="draft"
          type="text"
          class="rb-pattern"
          spellcheck="false"
          autocomplete="off"
          placeholder="pattern, e.g. (auth|login).*fail"
          :maxlength="patternLimit"
        />
      </label>
      <p v-if="errorMessage" class="rb-error" role="alert">{{ errorMessage }}</p>

      <div class="rb-snippets">
        <div v-for="group in snippetGroups" :key="group.name" class="rb-snippet-row">
          <span class="rb-snippet-label">{{ group.name }}</span>
          <button
            v-for="item in group.items"
            :key="item.text"
            type="button"
            class="rb-snippet"
            :title="item.tip"
            @click="insert(item.text)"
          >{{ item.text }}</button>
        </div>
      </div>

      <div class="rb-grid">
        <div class="rb-col">
          <span class="rb-col-label">Test string</span>
          <textarea v-model="testText" rows="4" class="rb-textarea" :maxlength="sampleLimit"></textarea>
          <div class="rb-highlight" aria-live="polite">
            <template v-for="(part, i) in highlightedParts">
              <mark v-if="part.match" :key="'m' + i">{{ part.text || '∅' }}</mark>
              <template v-else>{{ part.text }}</template>
            </template>
          </div>
        </div>
        <div class="rb-col">
          <span class="rb-col-label">Capture groups</span>
          <div class="rb-panel">
            <div v-for="g in groups" :key="g.n" class="rb-group-row">
              <span class="rb-group-n">{{ g.n }}</span><span>{{ g.val }}</span>
            </div>
            <p v-if="!groups.length" class="rb-muted">No captures on first match.</p>
          </div>
          <span class="rb-col-label">Explanation</span>
          <div class="rb-panel rb-panel--scroll">
            <div v-for="(ex, i) in explanation" :key="i" class="rb-explain-row">
              <span class="rb-explain-tok">{{ ex.tok }}</span><span class="rb-muted">{{ ex.desc }}</span>
            </div>
          </div>
        </div>
      </div>

      <div class="rb-corpus">
        <div class="rb-corpus__title">{{ corpusTitle }} · {{ matchSummary }}</div>
        <div v-for="(line, i) in previewLines" :key="i" class="rb-corpus__line">{{ line }}</div>
      </div>

      <div class="rb-actions">
        <button type="button" class="btn btn--text" @click="close">Cancel</button>
        <button type="button" class="btn btn--filled" :disabled="!isValid || !draft" @click="apply">Apply to search</button>
      </div>
    </div>
  </div>
</template>

<script>
import { REGEX_LIMITS } from '../../../regex-builder';
import Icon from './Icon.vue';

const EXPLAIN_DICT = [
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
].map(([name, items]) => ({ name, items: items.map(([text, tip]) => ({ text, tip })) }));

let uid = 0;

export default {
  name: 'RegexBuilderOverlay',
  components: { Icon },
  props: {
    initialPattern: { type: String, default: '' },
    corpus: { type: Array, default: () => [] },
    corpusTitle: { type: String, default: 'Matches' },
  },
  data() {
    return {
      titleId: `rb-title-${(uid += 1)}`,
      draft: this.initialPattern,
      flags: { i: true, g: true, m: false, s: false },
      testText: 'auth: login failed for user 42\npipeline #8812 passed in 04:31\nERROR TokenRefresh retry_count=3',
      patternLimit: REGEX_LIMITS.pattern,
      sampleLimit: REGEX_LIMITS.sample,
      matchLimit: REGEX_LIMITS.matches,
    };
  },
  computed: {
    flagString() {
      return Object.keys(this.flags).filter((f) => this.flags[f]).join('');
    },
    flagChips() {
      const tips = { i: 'case-insensitive', g: 'global', m: 'multiline', s: 'dotall' };
      return Object.keys(this.flags).map((name) => ({ name, tip: tips[name], on: this.flags[name] }));
    },
    snippetGroups() {
      return SNIPPET_GROUPS;
    },
    parsed() {
      if (!this.draft) return { valid: true, regex: null, error: '' };
      try {
        return { valid: true, regex: new RegExp(this.draft, this.flagString), error: '' };
      } catch (error) {
        return { valid: false, regex: null, error: String(error.message || error) };
      }
    },
    isValid() {
      return this.parsed.valid;
    },
    errorMessage() {
      return this.parsed.error;
    },
    validState() {
      if (!this.isValid) return { label: 'invalid', cls: 'rb-chip--bad' };
      if (!this.draft) return { label: 'empty', cls: 'rb-chip--neutral' };
      return { label: 'valid', cls: 'rb-chip--good' };
    },
    previewLines() {
      if (!this.isValid || !this.draft) return [];
      const re = this.parsed.regex;
      return this.corpus
        .filter((text) => {
          re.lastIndex = 0;
          return re.test(text);
        })
        .slice(0, 5);
    },
    matchSummary() {
      if (!this.isValid || !this.draft) return `0 of ${this.corpus.length}`;
      const re = this.parsed.regex;
      const count = this.corpus.filter((text) => {
        re.lastIndex = 0;
        return re.test(text);
      }).length;
      return `${count} of ${this.corpus.length}`;
    },
    highlightedParts() {
      if (!this.isValid || !this.draft) return [{ text: this.testText, match: false }];
      const flags = this.flagString.includes('g') ? this.flagString : `${this.flagString}g`;
      let global;
      try {
        global = new RegExp(this.draft, flags);
      } catch (_error) {
        return [{ text: this.testText, match: false }];
      }
      const parts = [];
      let last = 0;
      let i = 0;
      let match = global.exec(this.testText);
      while (match && i < this.matchLimit) {
        if (match.index > last) parts.push({ text: this.testText.slice(last, match.index), match: false });
        parts.push({ text: match[0], match: true });
        last = match.index + (match[0] ? match[0].length : 1);
        if (!match[0]) global.lastIndex += 1;
        i += 1;
        match = global.exec(this.testText);
      }
      parts.push({ text: this.testText.slice(last), match: false });
      return parts;
    },
    groups() {
      if (!this.isValid || !this.draft) return [];
      const flags = this.flagString.includes('g') ? this.flagString : `${this.flagString}g`;
      let global;
      try {
        global = new RegExp(this.draft, flags);
      } catch (_error) {
        return [];
      }
      const match = global.exec(this.testText);
      if (!match || match.length <= 1) return [];
      return match.slice(1).map((value, index) => ({ n: `$${index + 1}`, val: value === undefined ? '—' : value }));
    },
    explanation() {
      const out = [];
      let rest = this.draft;
      while (rest.length && out.length < 24) {
        const hit = EXPLAIN_DICT.find(([token]) => rest.startsWith(token));
        if (hit) {
          out.push({ tok: hit[0], desc: hit[1] });
          rest = rest.slice(hit[0].length);
        } else {
          let literal = '';
          while (rest.length && !EXPLAIN_DICT.some(([token]) => rest.startsWith(token))) {
            literal += rest[0];
            rest = rest.slice(1);
          }
          if (literal) out.push({ tok: literal.slice(0, 8), desc: `literal "${literal}"` });
        }
      }
      return out;
    },
  },
  mounted() {
    this.$nextTick(() => this.$refs.patternInput && this.$refs.patternInput.focus());
  },
  methods: {
    toggleFlag(name) {
      this.flags = { ...this.flags, [name]: !this.flags[name] };
    },
    insert(text) {
      this.draft += text.replace(/ /g, '');
    },
    apply() {
      if (!this.isValid || !this.draft) return;
      this.$emit('apply', this.draft);
    },
    close() {
      this.$emit('close');
    },
  },
};
</script>
