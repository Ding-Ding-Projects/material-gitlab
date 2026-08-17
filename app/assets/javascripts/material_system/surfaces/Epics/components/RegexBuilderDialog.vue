<script>
import { __, sprintf } from '~/locale';
import { RegexBuilder } from '../../../regex-builder';

const FLAG_TIPS = {
  i: __('case-insensitive'),
  g: __('global'),
  m: __('multiline'),
  s: __('dotall'),
};

const SNIPPET_GROUPS = [
  {
    name: __('Classes'),
    items: [
      ['\\d', __('digit 0-9')],
      ['\\w', __('word char')],
      ['\\s', __('whitespace')],
      ['[a-z]', __('range')],
      ['[^ ]', __('not space')],
      ['.', __('any char')],
    ],
  },
  {
    name: __('Quantifiers'),
    items: [
      ['*', __('zero+')],
      ['+', __('one+')],
      ['?', __('optional')],
      ['{2,5}', __('2 to 5')],
      ['*?', __('lazy zero+')],
      ['+?', __('lazy one+')],
    ],
  },
  {
    name: __('Anchors'),
    items: [
      ['^', __('line start')],
      ['$', __('line end')],
      ['\\b', __('word boundary')],
      ['\\B', __('non-boundary')],
    ],
  },
  {
    name: __('Groups'),
    items: [
      ['( )', __('capture')],
      ['(?: )', __('non-capture')],
      ['(a|b)', __('alternation')],
      ['(?= )', __('lookahead')],
      ['(?! )', __('neg lookahead')],
      ['(?<= )', __('lookbehind')],
    ],
  },
  {
    name: __('Recipes'),
    items: [
      ['#\\d+', __('ref number')],
      ['\\d{2}:\\d{2}', __('duration')],
      ['(fail|error)', __('failures')],
      ['^ERROR', __('error lines')],
      ['\\bretry\\w*', __('retry words')],
    ],
  },
];

// Token dictionary used to render a plain-English breakdown of the pattern.
const EXPLAIN_DICT = [
  ['(?:', __('non-capturing group')],
  ['(?=', __('lookahead')],
  ['(?!', __('negative lookahead')],
  ['(?<=', __('lookbehind')],
  ['(?<!', __('negative lookbehind')],
  ['(', __('capturing group')],
  [')', __('end group')],
  ['[^', __('negated class')],
  ['[', __('character class')],
  [']', __('end class')],
  ['\\d', __('digit')],
  ['\\D', __('non-digit')],
  ['\\w', __('word char')],
  ['\\W', __('non-word char')],
  ['\\s', __('whitespace')],
  ['\\S', __('non-whitespace')],
  ['\\b', __('word boundary')],
  ['\\B', __('non-boundary')],
  ['.*', __('any chars (greedy)')],
  ['.+', __('one or more chars')],
  ['.', __('any char')],
  ['*?', __('zero+ (lazy)')],
  ['+?', __('one+ (lazy)')],
  ['*', __('zero or more')],
  ['+', __('one or more')],
  ['??', __('optional (lazy)')],
  ['?', __('optional')],
  ['^', __('start anchor')],
  ['$', __('end anchor')],
  ['|', __('alternation')],
  ['{', __('repetition {n,m}')],
];

const MAX_EXPLAIN_TOKENS = 24;
const MAX_HIGHLIGHT_MATCHES = 200;
const MAX_CORPUS_PREVIEW = 5;

export default {
  name: 'RegexBuilderDialog',
  props: {
    initial: { type: String, default: '' },
    corpus: { type: Array, default: () => [] },
    corpusTitle: { type: String, default: () => __('Matches') },
  },
  data() {
    return {
      draft: this.initial,
      flags: { i: true, g: true, m: false, s: false },
      testText: __('auth: login failed for user 42\npipeline #8812 passed in 04:31\nERROR TokenRefresh retry_count=3'),
    };
  },
  computed: {
    flagsString() {
      return Object.keys(this.flags)
        .filter((flag) => this.flags[flag])
        .join('');
    },
    // The shared RegexBuilder primitive owns safe pattern construction and validity.
    evaluated() {
      return new RegexBuilder({ pattern: this.draft, regex: true, flags: this.flagsString }).snapshot();
    },
    isValid() {
      return this.evaluated.syntax.valid;
    },
    validityLabel() {
      if (!this.isValid) return __('invalid');
      return this.draft ? __('valid') : __('empty');
    },
    validityModifier() {
      if (!this.isValid) return 'gl-mds-epics__validity-chip--invalid';
      return this.draft ? 'gl-mds-epics__validity-chip--valid' : 'gl-mds-epics__validity-chip--empty';
    },
    flagChips() {
      return Object.keys(this.flags).map((name) => ({ name, tip: FLAG_TIPS[name], active: this.flags[name] }));
    },
    snippetGroups() {
      return SNIPPET_GROUPS;
    },
    // Highlights every occurrence in the test string regardless of the "g" flag,
    // and captures the first match's groups, matching the design's preview intent.
    highlightResult() {
      const fallback = { segments: [{ text: this.testText, matched: false }], groups: [] };
      if (!this.isValid || !this.draft) return fallback;
      let expression;
      try {
        expression = new RegExp(this.draft, this.flagsString.includes('g') ? this.flagsString : `${this.flagsString}g`);
      } catch (_error) {
        return fallback;
      }
      const segments = [];
      let groups = [];
      let last = 0;
      let iterations = 0;
      let match = expression.exec(this.testText);
      while (match && iterations < MAX_HIGHLIGHT_MATCHES) {
        if (match.index > last) segments.push({ text: this.testText.slice(last, match.index), matched: false });
        segments.push({ text: match[0] || '∅', matched: true });
        last = match.index + (match[0] ? match[0].length : 1);
        if (!match[0]) expression.lastIndex += 1;
        if (iterations === 0 && match.length > 1) {
          groups = match.slice(1).map((value, index) => ({ n: `$${index + 1}`, val: value === undefined ? '—' : value }));
        }
        iterations += 1;
        match = expression.exec(this.testText);
      }
      segments.push({ text: this.testText.slice(last), matched: false });
      return { segments, groups };
    },
    groups() {
      return this.highlightResult.groups;
    },
    explain() {
      const tokens = [];
      let rest = this.draft;
      while (rest.length && tokens.length < MAX_EXPLAIN_TOKENS) {
        const hit = EXPLAIN_DICT.find(([token]) => rest.startsWith(token));
        if (hit) {
          tokens.push({ tok: hit[0], desc: hit[1] });
          rest = rest.slice(hit[0].length);
        } else {
          let literal = '';
          while (rest.length && !EXPLAIN_DICT.some(([token]) => rest.startsWith(token))) {
            literal += rest[0];
            rest = rest.slice(1);
          }
          if (literal) tokens.push({ tok: literal.slice(0, 8), desc: sprintf(__('literal "%{literal}"'), { literal }) });
        }
      }
      return tokens;
    },
    corpusPreview() {
      if (!this.isValid || !this.draft) return { matches: [], matchCount: `0 ${__('of')} ${this.corpus.length}` };
      const matches = this.corpus
        .filter((item) => {
          try {
            return new RegExp(this.draft, this.flagsString).test(item);
          } catch (_error) {
            return false;
          }
        })
        .slice(0, MAX_CORPUS_PREVIEW);
      return { matches, matchCount: `${matches.length} ${__('of')} ${this.corpus.length}` };
    },
  },
  methods: {
    toggleFlag(name) {
      this.flags = { ...this.flags, [name]: !this.flags[name] };
    },
    insertSnippet(text) {
      this.draft += text.replace(/ /g, '');
    },
    stop(event) {
      event.stopPropagation();
    },
    apply() {
      this.$emit('apply', this.draft);
    },
  },
};
</script>

<template>
  <div class="gl-mds-epics__scrim" role="presentation" @click="$emit('close')">
    <div
      class="gl-mds-epics__dialog"
      role="dialog"
      aria-modal="true"
      :aria-label="__('Regex builder')"
      @click="stop"
    >
      <div class="gl-mds-epics__dialog-title-row">
        <h2 class="gl-mds-epics__dialog-title">{{ __('Regex builder') }}</h2>
        <span class="gl-mds-epics__validity-chip" :class="validityModifier">{{ validityLabel }}</span>
        <div class="gl-mds-epics__flags">
          <button
            v-for="flag in flagChips"
            :key="flag.name"
            type="button"
            class="gl-mds-epics__flag-chip"
            :aria-pressed="flag.active"
            :title="flag.tip"
            @click="toggleFlag(flag.name)"
          >
            {{ flag.name }}
          </button>
        </div>
      </div>
      <label class="gl-mds-sr-only" for="epics-regex-draft">{{ __('Pattern') }}</label>
      <input
        id="epics-regex-draft"
        v-model="draft"
        class="gl-mds-epics__pattern-input"
        type="text"
        :placeholder="__('pattern, e.g. (auth|login).*fail')"
        autocomplete="off"
        spellcheck="false"
      />
      <p v-if="!isValid" class="gl-mds-epics__error-text" role="alert">{{ evaluated.syntax.message }}</p>
      <div class="gl-mds-epics__snippet-groups">
        <div v-for="group in snippetGroups" :key="group.name" class="gl-mds-epics__snippet-row">
          <span class="gl-mds-epics__snippet-label">{{ group.name }}</span>
          <button
            v-for="item in group.items"
            :key="item[0]"
            type="button"
            class="gl-mds-epics__snippet"
            :title="item[1]"
            @click="insertSnippet(item[0])"
          >
            {{ item[0] }}
          </button>
        </div>
      </div>
      <div class="gl-mds-epics__two-col">
        <div class="gl-mds-epics__col">
          <span class="gl-mds-epics__col-label">{{ __('Test string') }}</span>
          <label class="gl-mds-sr-only" for="epics-regex-test">{{ __('Test string') }}</label>
          <textarea id="epics-regex-test" v-model="testText" class="gl-mds-epics__textarea" rows="4"></textarea>
          <div class="gl-mds-epics__preview-box">
            <template v-for="(segment, index) in highlightResult.segments">
              <mark v-if="segment.matched" :key="index">{{ segment.text }}</mark>
              <template v-else>{{ segment.text }}</template>
            </template>
          </div>
        </div>
        <div class="gl-mds-epics__col">
          <span class="gl-mds-epics__col-label">{{ __('Capture groups') }}</span>
          <div class="gl-mds-epics__groups-box">
            <div v-for="group in groups" :key="group.n" class="gl-mds-epics__group-row">
              <span class="gl-mds-epics__group-index">{{ group.n }}</span>
              <span>{{ group.val }}</span>
            </div>
            <div v-if="!groups.length" class="gl-mds-epics__empty-text">{{ __('No captures on first match.') }}</div>
          </div>
          <span class="gl-mds-epics__col-label">{{ __('Explanation') }}</span>
          <div class="gl-mds-epics__explain-box">
            <div v-for="(item, index) in explain" :key="index" class="gl-mds-epics__explain-row">
              <span class="gl-mds-epics__explain-token">{{ item.tok }}</span>
              <span>{{ item.desc }}</span>
            </div>
          </div>
        </div>
      </div>
      <div class="gl-mds-epics__corpus-box">
        <div class="gl-mds-epics__corpus-title">{{ corpusTitle }} · {{ corpusPreview.matchCount }}</div>
        <div v-for="(item, index) in corpusPreview.matches" :key="index" class="gl-mds-epics__corpus-item">
          {{ item }}
        </div>
      </div>
      <div class="gl-mds-epics__dialog-actions">
        <button type="button" class="gl-mds-epics__btn" @click="$emit('close')">{{ __('Cancel') }}</button>
        <button type="button" class="gl-mds-epics__btn gl-mds-epics__btn--filled" @click="apply">
          {{ __('Apply to search') }}
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.gl-mds-sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}
</style>
