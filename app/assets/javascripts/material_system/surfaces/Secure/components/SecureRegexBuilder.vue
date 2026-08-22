<template>
  <div
    ref="root"
    class="secure-regex"
    role="dialog"
    aria-modal="false"
    aria-label="Regex builder"
    @keydown.esc="close"
  >
    <div class="secure-regex__header">
      <h2 class="secure-regex__title">Regex builder</h2>
      <span class="secure-regex__validity" :class="{ 'secure-regex__validity--invalid': !isValid }">
        {{ validityLabel }}
      </span>
      <div class="secure-regex__flags" role="group" aria-label="Regex flags">
        <button
          v-for="flag in flagList"
          :key="flag.key"
          type="button"
          class="secure-regex__flag"
          :class="{ 'secure-regex__flag--active': flags[flag.key] }"
          :aria-pressed="flags[flag.key]"
          :title="flag.title"
          @click="toggleFlag(flag.key)"
        >
          {{ flag.key }}
        </button>
      </div>
    </div>
    <label :for="patternId" class="secure-visually-hidden">Regex pattern</label>
    <input
      :id="patternId"
      ref="patternInput"
      v-model="draft"
      class="secure-regex__pattern"
      type="text"
      placeholder="pattern, e.g. (auth|login).*fail"
      autocomplete="off"
      spellcheck="false"
    />
    <p v-if="!isValid" class="secure-regex__error" role="alert">{{ errorMessage }}</p>
    <div class="secure-regex__snippets">
      <div v-for="group in snippetGroups" :key="group.name" class="secure-regex__snippet-group">
        <span class="secure-regex__snippet-name">{{ group.name }}</span>
        <button
          v-for="snippet in group.items"
          :key="snippet.text"
          type="button"
          class="secure-regex__snippet"
          :title="snippet.tip"
          @click="insertSnippet(snippet.text)"
        >
          {{ snippet.text }}
        </button>
      </div>
    </div>
    <div class="secure-regex__grid">
      <div class="secure-regex__column">
        <label :for="testTextId" class="secure-regex__label">Test string</label>
        <textarea :id="testTextId" v-model="testText" class="secure-regex__textarea" rows="4"></textarea>
        <p class="secure-regex__highlight" aria-live="polite">
          <template v-for="(segment, index) in highlightSegments">
            <mark v-if="segment.match" :key="'m-' + index" class="secure-regex__mark">{{ segment.text }}</mark>
            <span v-else :key="'t-' + index">{{ segment.text }}</span>
          </template>
        </p>
      </div>
      <div class="secure-regex__column">
        <span class="secure-regex__label">Capture groups</span>
        <div class="secure-regex__groups">
          <div v-for="(group, index) in firstMatchGroups" :key="index" class="secure-regex__group">
            <span class="secure-regex__group-name">${{ index + 1 }}</span>
            <span>{{ group === undefined || group === null ? '—' : group }}</span>
          </div>
          <p v-if="firstMatchGroups.length === 0" class="secure-regex__no-captures">No captures on first match.</p>
        </div>
      </div>
    </div>
    <div class="secure-regex__preview">
      <div class="secure-regex__preview-title">{{ corpusTitle }} · {{ matchCountLabel }}</div>
      <div v-for="(item, index) in previewItems" :key="index" class="secure-regex__preview-item">{{ item }}</div>
    </div>
    <div class="secure-regex__actions">
      <button type="button" class="secure-regex__button" @click="close">Cancel</button>
      <button type="button" class="secure-regex__button secure-regex__button--primary" @click="apply">
        Apply to search
      </button>
    </div>
  </div>
</template>

<script>
import { uniqueId } from 'lodash';
import RegexBuilder from '../../../regex-builder';

const FLAG_TITLES = { i: 'case-insensitive', g: 'global', m: 'multiline', s: 'dotall' };
const SNIPPET_GROUPS = [
  ['Classes', [
    ['\\d', 'digit 0-9'], ['\\w', 'word char'], ['\\s', 'whitespace'],
    ['[a-z]', 'range'], ['[^ ]', 'not space'], ['.', 'any char'],
  ]],
  ['Quantifiers', [['*', 'zero or more'], ['+', 'one or more'], ['?', 'optional'], ['{2,5}', '2 to 5']]],
  ['Anchors', [['^', 'line start'], ['$', 'line end'], ['\\b', 'word boundary']]],
  ['Groups', [['( )', 'capture'], ['(?: )', 'non-capture'], ['(a|b)', 'alternation']]],
];

export default {
  name: 'SecureRegexBuilder',
  props: {
    initial: { type: String, default: '' },
    corpus: { type: Array, default: () => [] },
    corpusTitle: { type: String, default: 'Matches' },
  },
  data() {
    return {
      draft: this.initial || '',
      flags: { i: true, g: true, m: false, s: false },
      testText: 'auth: login failed for user 42\npipeline #8812 passed in 04:31\nERROR TokenRefresh retry_count=3',
      snippetGroups: SNIPPET_GROUPS.map(([name, items]) => ({
        name,
        items: items.map(([text, tip]) => ({ text, tip })),
      })),
      patternId: uniqueId('secure-regex-pattern-'),
      testTextId: uniqueId('secure-regex-test-text-'),
    };
  },
  computed: {
    flagList() {
      return Object.keys(FLAG_TITLES).map((key) => ({ key, title: FLAG_TITLES[key] }));
    },
    flagString() {
      return Object.keys(this.flags)
        .filter((key) => this.flags[key])
        .join('');
    },
    validity() {
      const builder = new RegexBuilder({ pattern: this.draft || '(?!)', sample: '', flags: this.flagString, regex: true });
      return builder.state.syntax;
    },
    isValid() {
      return this.validity.valid;
    },
    errorMessage() {
      return this.validity.message;
    },
    validityLabel() {
      if (!this.isValid) return 'invalid';
      return this.draft ? 'valid' : 'empty';
    },
    highlightFlags() {
      return this.flagString.includes('g') ? this.flagString : `${this.flagString}g`;
    },
    highlightEvaluation() {
      if (!this.draft || !this.isValid) return { matches: [], captures: [] };
      const builder = new RegexBuilder({ pattern: this.draft, sample: this.testText, flags: this.highlightFlags, regex: true });
      return builder.state;
    },
    highlightSegments() {
      const matches = this.highlightEvaluation.matches;
      const text = this.testText;
      if (matches.length === 0) return [{ text, match: false }];
      const segments = [];
      let last = 0;
      matches.forEach((entry) => {
        if (entry.index > last) segments.push({ text: text.slice(last, entry.index), match: false });
        segments.push({ text: entry.value || '∅', match: true });
        last = entry.index + (entry.value ? entry.value.length : 1);
      });
      if (last < text.length) segments.push({ text: text.slice(last), match: false });
      return segments;
    },
    firstMatchGroups() {
      return this.highlightEvaluation.captures[0] || [];
    },
    corpusMatches() {
      if (!this.draft || !this.isValid) return [];
      try {
        const expression = new RegExp(this.draft, this.flagString.replace('g', ''));
        return this.corpus.filter((text) => expression.test(text));
      } catch (error) {
        return [];
      }
    },
    matchCountLabel() {
      return `${this.corpusMatches.length} of ${this.corpus.length}`;
    },
    previewItems() {
      return this.corpusMatches.slice(0, 5);
    },
  },
  mounted() {
    this.$nextTick(() => this.$refs.patternInput && this.$refs.patternInput.focus());
    this._onDocumentMousedown = (event) => {
      if (this.$refs.root && !this.$refs.root.contains(event.target)) this.close();
    };
    document.addEventListener('mousedown', this._onDocumentMousedown);
  },
  beforeDestroy() {
    document.removeEventListener('mousedown', this._onDocumentMousedown);
  },
  methods: {
    toggleFlag(key) {
      this.flags = { ...this.flags, [key]: !this.flags[key] };
    },
    insertSnippet(text) {
      this.draft += text.replace(/ /g, '');
    },
    close() {
      this.$emit('close');
    },
    apply() {
      this.$emit('apply', this.draft);
    },
  },
};
</script>
