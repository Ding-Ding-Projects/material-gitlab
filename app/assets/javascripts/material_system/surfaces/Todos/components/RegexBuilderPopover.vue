<script>
import MdIcon from './MdIcon.vue';
import { RegexBuilder } from '../../../regex-builder';

const FLAG_TIPS = { i: 'case-insensitive', g: 'global', m: 'multiline', s: 'dotall' };

const SNIPPET_GROUPS = [
  ['Classes', [['\\d', 'digit 0-9'], ['\\w', 'word char'], ['\\s', 'whitespace'], ['[a-z]', 'range'], ['[^ ]', 'not space'], ['.', 'any char']]],
  ['Quantifiers', [['*', 'zero+'], ['+', 'one+'], ['?', 'optional'], ['{2,5}', '2 to 5'], ['*?', 'lazy zero+'], ['+?', 'lazy one+']]],
  ['Anchors', [['^', 'line start'], ['$', 'line end'], ['\\b', 'word boundary'], ['\\B', 'non-boundary']]],
  ['Groups', [['()', 'capture'], ['(?:)', 'non-capture'], ['(a|b)', 'alternation'], ['(?=)', 'lookahead'], ['(?!)', 'neg lookahead'], ['(?<=)', 'lookbehind']]],
  ['Recipes', [['#\\d+', 'ref number'], ['\\d{2}:\\d{2}', 'duration'], ['(fail|error)', 'failures'], ['^ERROR', 'error lines'], ['\\bretry\\w*', 'retry words']]],
].map(([name, items]) => ({ name, items: items.map(([text, tip]) => ({ text, tip })) }));

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

function explainPattern(pattern) {
  const explanation = [];
  let rest = pattern || '';
  while (rest.length && explanation.length < 24) {
    const hit = EXPLAIN_DICTIONARY.find(([token]) => rest.startsWith(token));
    if (hit) {
      explanation.push({ token: hit[0], description: hit[1] });
      rest = rest.slice(hit[0].length);
      continue;
    }
    let literal = '';
    while (rest.length && !EXPLAIN_DICTIONARY.some(([token]) => rest.startsWith(token))) {
      literal += rest[0];
      rest = rest.slice(1);
    }
    if (literal) explanation.push({ token: literal.slice(0, 8), description: `literal "${literal}"` });
  }
  return explanation;
}

/**
 * Anchored regex-builder dialog. Pattern/flag/sample evaluation is delegated
 * to the shared RegexBuilder primitive; snippets, the token explainer, and
 * the corpus preview are presentation concerns specific to this popover.
 */
export default {
  name: 'RegexBuilderPopover',
  components: { MdIcon },
  props: {
    initialPattern: {
      type: String,
      default: '',
    },
    corpus: {
      type: Array,
      default: () => [],
    },
    corpusTitle: {
      type: String,
      default: 'Matches',
    },
  },
  data() {
    return {
      pattern: this.initialPattern,
      flags: { i: true, g: true, m: false, s: false },
      testText: 'auth: login failed for user 42\npipeline #8812 passed in 04:31\nERROR TokenRefresh retry_count=3',
      flagTips: FLAG_TIPS,
      snippetGroups: SNIPPET_GROUPS,
    };
  },
  computed: {
    flagsString() {
      return ['i', 'g', 'm', 's'].filter((f) => this.flags[f]).join('');
    },
    regexModel() {
      return new RegexBuilder({
        pattern: this.pattern,
        sample: this.testText,
        flags: this.flagsString,
        regex: true,
      }).snapshot();
    },
    isValid() {
      return this.regexModel.syntax.valid;
    },
    validityLabel() {
      if (!this.isValid) return 'invalid';
      return this.pattern ? 'valid' : 'empty';
    },
    highlightedSegments() {
      const text = this.testText;
      const matches = this.regexModel.matches;
      if (!this.pattern || !this.isValid || matches.length === 0) return [{ text, matched: false }];
      const segments = [];
      let last = 0;
      matches.forEach((match) => {
        if (match.index > last) segments.push({ text: text.slice(last, match.index), matched: false });
        segments.push({ text: match.value || '∅', matched: true });
        last = match.index + (match.value ? match.value.length : 1);
      });
      if (last < text.length) segments.push({ text: text.slice(last), matched: false });
      return segments;
    },
    captureGroups() {
      const first = this.regexModel.captures[0] || [];
      return first.map((value, index) => ({ name: `$${index + 1}`, value: value === undefined ? '—' : value }));
    },
    explanation() {
      return this.isValid ? explainPattern(this.pattern) : [];
    },
    corpusMatches() {
      if (!this.pattern || !this.isValid) return [];
      try {
        const re = new RegExp(this.pattern, this.flagsString);
        return this.corpus.filter((text) => re.test(text));
      } catch (_error) {
        return [];
      }
    },
    matchCountLabel() {
      return `${this.corpusMatches.length} of ${this.corpus.length}`;
    },
  },
  mounted() {
    this._onKeydown = (event) => {
      if (event.key === 'Escape') this.close();
    };
    window.addEventListener('keydown', this._onKeydown);
    this.$nextTick(() => this.$refs.patternInput && this.$refs.patternInput.focus());
  },
  beforeDestroy() {
    window.removeEventListener('keydown', this._onKeydown);
  },
  methods: {
    insertSnippet(text) {
      this.pattern += text.replace(/ /g, '');
    },
    toggleFlag(flag) {
      this.$set(this.flags, flag, !this.flags[flag]);
    },
    close() {
      this.$emit('close');
    },
    apply() {
      this.$emit('apply', this.pattern);
    },
  },
};
</script>

<template>
  <div class="md-todos__scrim" @click="close">
    <div
      class="md-todos__regex-dialog"
      role="dialog"
      aria-modal="true"
      aria-labelledby="regex-dialog-title"
      data-screen-label="Regex builder"
      @click.stop
    >
      <div class="md-todos__regex-dialog-head">
        <h2 id="regex-dialog-title" class="md-todos__dialog-title">Regex builder</h2>
        <span
          class="md-todos__pill"
          :class="isValid ? 'md-todos__pill--good' : 'md-todos__pill--error'"
        >
          {{ validityLabel }}
        </span>
        <div class="md-todos__flag-chips">
          <button
            v-for="flag in ['i', 'g', 'm', 's']"
            :key="flag"
            type="button"
            class="md-todos__flag-chip"
            :class="{ 'md-todos__flag-chip--active': flags[flag] }"
            :title="flagTips[flag]"
            :aria-pressed="flags[flag]"
            :aria-label="`Toggle ${flagTips[flag]} flag`"
            @click="toggleFlag(flag)"
          >
            {{ flag }}
          </button>
        </div>
        <button
          type="button"
          class="md-todos__icon-button"
          aria-label="Close regex builder"
          @click="close"
        >
          <md-icon name="close" :size="18" />
        </button>
      </div>

      <label class="md-todos__visually-hidden" for="regex-pattern-input">Regex pattern</label>
      <input
        id="regex-pattern-input"
        ref="patternInput"
        v-model="pattern"
        class="md-todos__regex-pattern-input"
        type="text"
        placeholder="pattern, e.g. (auth|login).*fail"
        :aria-invalid="!isValid"
      />
      <div v-if="!isValid" class="md-todos__regex-error">{{ regexModel.syntax.message }}</div>

      <div class="md-todos__snippet-groups">
        <div v-for="group in snippetGroups" :key="group.name" class="md-todos__snippet-row">
          <span class="md-todos__snippet-label">{{ group.name }}</span>
          <button
            v-for="snippet in group.items"
            :key="group.name + snippet.text"
            type="button"
            class="md-todos__snippet"
            :title="snippet.tip"
            @click="insertSnippet(snippet.text)"
          >
            {{ snippet.text }}
          </button>
        </div>
      </div>

      <div class="md-todos__regex-columns">
        <div class="md-todos__regex-column">
          <div class="md-todos__snippet-label">Test string</div>
          <label class="md-todos__visually-hidden" for="regex-test-text">Test string</label>
          <textarea id="regex-test-text" v-model="testText" class="md-todos__test-textarea" rows="4"></textarea>
          <div class="md-todos__highlighted" aria-live="polite">
            <template v-for="(segment, idx) in highlightedSegments">
              <mark v-if="segment.matched" :key="'m' + idx">{{ segment.text }}</mark>
              <span v-else :key="'t' + idx">{{ segment.text }}</span>
            </template>
          </div>
        </div>
        <div class="md-todos__regex-column">
          <div class="md-todos__snippet-label">Capture groups</div>
          <div class="md-todos__panel">
            <div v-for="group in captureGroups" :key="group.name" class="md-todos__capture-row">
              <span class="md-todos__capture-name">{{ group.name }}</span>
              <span>{{ group.value }}</span>
            </div>
            <p v-if="captureGroups.length === 0" class="md-todos__muted">No captures on first match.</p>
          </div>
          <div class="md-todos__snippet-label">Explanation</div>
          <div class="md-todos__panel md-todos__panel--scroll">
            <div v-for="(item, idx) in explanation" :key="idx" class="md-todos__explain-row">
              <span class="md-todos__capture-name">{{ item.token }}</span>
              <span class="md-todos__muted">{{ item.description }}</span>
            </div>
          </div>
        </div>
      </div>

      <div class="md-todos__corpus-panel">
        <div class="md-todos__snippet-label">{{ corpusTitle }} · {{ matchCountLabel }}</div>
        <div v-for="(text, idx) in corpusMatches.slice(0, 5)" :key="idx" class="md-todos__corpus-row">
          {{ text }}
        </div>
      </div>

      <div class="md-todos__dialog-actions">
        <button type="button" class="md-todos__text-action" @click="close">Cancel</button>
        <button type="button" class="md-todos__filled-action" @click="apply">Apply to search</button>
      </div>
    </div>
  </div>
</template>
