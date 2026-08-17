<template>
  <div class="mgl-pl-scrim" @click="$emit('close')" @keydown.esc="$emit('close')">
    <div
      ref="panel"
      class="mgl-pl-dialog mgl-pl-regex"
      data-screen-label="Regex builder"
      role="dialog"
      aria-modal="true"
      aria-labelledby="mgl-pl-regex-title"
      tabindex="-1"
      @click.stop
    >
      <div class="mgl-pl-regex-head">
        <h2 id="mgl-pl-regex-title">Regex builder</h2>
        <span class="mgl-pl-regex-valid" :style="{ background: validBg, color: validFg }">{{ validLabel }}</span>
        <div class="mgl-pl-regex-flags" role="group" aria-label="Regex flags">
          <button
            v-for="flag in flagChips"
            :key="flag.name"
            type="button"
            class="mgl-pl-regex-flagchip"
            :style="{ background: flag.bg, color: flag.fg }"
            :aria-pressed="flag.on"
            :title="flag.tip"
            :aria-label="flag.tip"
            @click="toggleFlag(flag.name)"
          >
            {{ flag.name }}
          </button>
        </div>
      </div>

      <label class="mgl-visually-hidden" for="mgl-pl-regex-pattern">Regex pattern</label>
      <input
        id="mgl-pl-regex-pattern"
        class="mgl-pl-regex-pattern"
        :value="pattern"
        :maxlength="patternLimit"
        placeholder="pattern, e.g. (auth|login).*fail"
        autocomplete="off"
        spellcheck="false"
        @input="setPattern($event.target.value)"
      />
      <div v-if="errorMsg" class="mgl-pl-regex-error">{{ errorMsg }}</div>

      <div class="mgl-pl-regex-snippets">
        <div v-for="group in snippetGroups" :key="group.name" class="mgl-pl-regex-snippet-row">
          <span class="mgl-pl-regex-snippet-label">{{ group.name }}</span>
          <button
            v-for="item in group.items"
            :key="item.text"
            type="button"
            class="mgl-pl-regex-snippet"
            :title="item.tip"
            @click="insertSnippet(item.text)"
          >
            {{ item.text }}
          </button>
        </div>
      </div>

      <div class="mgl-pl-regex-grid">
        <div class="mgl-pl-regex-col">
          <div class="mgl-pl-regex-label">Test string</div>
          <label class="mgl-visually-hidden" for="mgl-pl-regex-sample">Test string</label>
          <textarea
            id="mgl-pl-regex-sample"
            class="mgl-pl-regex-textarea"
            :value="sample"
            :maxlength="sampleLimit"
            rows="4"
            @input="setSample($event.target.value)"
          ></textarea>
          <div class="mgl-pl-regex-highlight" aria-live="polite">
            <component
              :is="segment.match ? 'mark' : 'span'"
              v-for="(segment, index) in highlightSegments"
              :key="index"
              >{{ segment.text }}</component
            >
          </div>
        </div>
        <div class="mgl-pl-regex-col">
          <div class="mgl-pl-regex-label">Capture groups</div>
          <div class="mgl-pl-regex-panel">
            <div v-for="g in groups" :key="g.n" class="mgl-pl-regex-group">
              <span class="mgl-pl-regex-group-n">{{ g.n }}</span><span>{{ g.val }}</span>
            </div>
            <div v-if="noGroups" class="mgl-pl-regex-nogroups">No captures on first match.</div>
          </div>
          <div class="mgl-pl-regex-label">Explanation</div>
          <div class="mgl-pl-regex-panel mgl-pl-regex-explain">
            <div v-for="(ex, index) in explain" :key="index" class="mgl-pl-regex-explain-row">
              <span class="mgl-pl-regex-tok">{{ ex.tok }}</span><span class="mgl-pl-regex-desc">{{ ex.desc }}</span>
            </div>
          </div>
        </div>
      </div>

      <div class="mgl-pl-regex-corpus">
        <div class="mgl-pl-regex-corpus-title">{{ corpusTitle }} · {{ matchCount }}</div>
        <div v-for="(line, index) in preview" :key="index" class="mgl-pl-regex-corpus-line">{{ line }}</div>
      </div>

      <div class="mgl-pl-confirm-actions">
        <button type="button" class="mgl-pl-text-btn" @click="$emit('close')">Cancel</button>
        <button type="button" class="mgl-pl-filled-btn" @click="apply">Apply to search</button>
      </div>
    </div>
  </div>
</template>

<script>
import { RegexBuilder, REGEX_LIMITS } from '../../../regex-builder';

const FLAG_TIPS = { i: 'case-insensitive', g: 'global', m: 'multiline', s: 'dotall' };

const SNIPPET_GROUPS = [
  ['Classes', [['\\d', 'digit 0-9'], ['\\w', 'word char'], ['\\s', 'whitespace'], ['[a-z]', 'range'], ['[^ ]', 'not space'], ['.', 'any char']]],
  ['Quantifiers', [['*', 'zero+'], ['+', 'one+'], ['?', 'optional'], ['{2,5}', '2 to 5'], ['*?', 'lazy zero+'], ['+?', 'lazy one+']]],
  ['Anchors', [['^', 'line start'], ['$', 'line end'], ['\\b', 'word boundary'], ['\\B', 'non-boundary']]],
  ['Groups', [['( )', 'capture'], ['(?: )', 'non-capture'], ['(a|b)', 'alternation'], ['(?= )', 'lookahead'], ['(?! )', 'neg lookahead'], ['(?<= )', 'lookbehind']]],
  ['Recipes', [['#\\d+', 'ref number'], ['\\d{2}:\\d{2}', 'duration'], ['(fail|error)', 'failures'], ['^ERROR', 'error lines'], ['\\bretry\\w*', 'retry words']]],
];

const EXPLAIN_DICT = [
  ['(?:', 'non-capturing group'], ['(?=', 'lookahead'], ['(?!', 'negative lookahead'], ['(?<=', 'lookbehind'], ['(?<!', 'negative lookbehind'],
  ['(', 'capturing group'], [')', 'end group'], ['[^', 'negated class'], ['[', 'character class'], [']', 'end class'],
  ['\\d', 'digit'], ['\\D', 'non-digit'], ['\\w', 'word char'], ['\\W', 'non-word char'], ['\\s', 'whitespace'], ['\\S', 'non-whitespace'],
  ['\\b', 'word boundary'], ['\\B', 'non-boundary'], ['.*', 'any chars (greedy)'], ['.+', 'one or more chars'], ['.', 'any char'],
  ['*?', 'zero+ (lazy)'], ['+?', 'one+ (lazy)'], ['*', 'zero or more'], ['+', 'one or more'], ['??', 'optional (lazy)'], ['?', 'optional'],
  ['^', 'start anchor'], ['$', 'end anchor'], ['|', 'alternation'], ['{', 'repetition {n,m}'],
];

const DEFAULT_TEST_TEXT = 'auth: login failed for user 42\npipeline #8812 passed in 04:31\nERROR TokenRefresh retry_count=3';

export default {
  name: 'PipelinesRegexBuilderPopover',
  props: {
    initialPattern: { type: String, default: '' },
    corpus: { type: Array, default: () => [] },
    corpusTitle: { type: String, default: 'Matches' },
  },
  data() {
    return { regexSnapshot: null };
  },
  created() {
    this.builder = new RegexBuilder({
      pattern: this.initialPattern,
      sample: DEFAULT_TEST_TEXT,
      flags: 'ig',
      regex: true,
    });
    this.regexSnapshot = this.builder.snapshot();
  },
  computed: {
    patternLimit() {
      return REGEX_LIMITS.pattern;
    },
    sampleLimit() {
      return REGEX_LIMITS.sample;
    },
    pattern() {
      return this.regexSnapshot.pattern;
    },
    sample() {
      return this.regexSnapshot.sample;
    },
    valid() {
      return this.regexSnapshot.syntax.valid;
    },
    validLabel() {
      if (!this.valid) return 'invalid';
      return this.pattern ? 'valid' : 'empty';
    },
    validBg() {
      return this.valid ? 'var(--goodc)' : 'var(--errc)';
    },
    validFg() {
      return this.valid ? 'var(--good)' : 'var(--err)';
    },
    errorMsg() {
      return this.regexSnapshot.syntax.message;
    },
    flagChips() {
      const active = this.regexSnapshot.flags;
      return ['i', 'g', 'm', 's'].map((name) => ({
        name,
        tip: FLAG_TIPS[name],
        on: active.includes(name),
        bg: active.includes(name) ? 'var(--prim)' : 'var(--surfc)',
        fg: active.includes(name) ? 'var(--onprim)' : 'var(--onsurfv)',
      }));
    },
    snippetGroups() {
      return SNIPPET_GROUPS.map(([name, items]) => ({
        name,
        items: items.map(([text, tip]) => ({ text, tip })),
      }));
    },
    highlightSegments() {
      const text = this.sample;
      if (!this.pattern || !this.valid) return [{ text, match: false }];
      const matches = this.regexSnapshot.matches;
      if (!matches.length) return [{ text, match: false }];
      const segments = [];
      let cursor = 0;
      matches.forEach((m) => {
        if (m.index > cursor) segments.push({ text: text.slice(cursor, m.index), match: false });
        segments.push({ text: m.value === '' ? '∅' : m.value, match: true });
        cursor = Math.max(cursor, m.index + m.value.length);
      });
      if (cursor < text.length) segments.push({ text: text.slice(cursor), match: false });
      return segments;
    },
    groups() {
      if (!this.pattern || !this.valid) return [];
      const caps = this.regexSnapshot.captures[0];
      if (!caps || !caps.length) return [];
      return caps.map((v, idx) => ({ n: `$${idx + 1}`, val: v === undefined ? '—' : v }));
    },
    noGroups() {
      return this.groups.length === 0;
    },
    explain() {
      let rest = this.pattern;
      const rows = [];
      while (rest.length && rows.length < 24) {
        const hit = EXPLAIN_DICT.find(([token]) => rest.startsWith(token));
        if (hit) {
          rows.push({ tok: hit[0], desc: hit[1] });
          rest = rest.slice(hit[0].length);
        } else {
          let literal = '';
          while (rest.length && !EXPLAIN_DICT.some(([token]) => rest.startsWith(token))) {
            literal += rest[0];
            rest = rest.slice(1);
          }
          if (literal) rows.push({ tok: literal.slice(0, 8), desc: `literal "${literal}"` });
        }
      }
      return rows;
    },
    compiledForCorpus() {
      if (!this.valid || !this.pattern) return null;
      try {
        return new RegExp(this.pattern, this.regexSnapshot.flags);
      } catch (_error) {
        return null;
      }
    },
    preview() {
      const re = this.compiledForCorpus;
      if (!re) return [];
      return this.corpus
        .filter((line) => {
          re.lastIndex = 0;
          return re.test(line);
        })
        .slice(0, 5);
    },
    matchCount() {
      return `${this.preview.length} of ${this.corpus.length}`;
    },
  },
  mounted() {
    this.$refs.panel.focus();
  },
  methods: {
    setPattern(value) {
      this.regexSnapshot = this.builder.update({ pattern: value });
    },
    setSample(value) {
      this.regexSnapshot = this.builder.update({ sample: value });
    },
    toggleFlag(name) {
      const current = this.regexSnapshot.flags;
      const next = current.includes(name) ? current.replace(name, '') : current + name;
      this.regexSnapshot = this.builder.update({ flags: next });
    },
    insertSnippet(text) {
      this.setPattern(this.pattern + text.replace(/ /g, ''));
    },
    apply() {
      this.$emit('apply', this.pattern);
    },
  },
};
</script>

<style scoped>
.mgl-pl-regex {
  width: 780px;
  max-width: 92vw;
  padding: 26px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.mgl-pl-regex-head {
  display: flex;
  align-items: center;
  gap: 12px;
}

.mgl-pl-regex-head h2 {
  margin: 0;
  font-family: 'Google Sans', sans-serif;
  font-size: 20px;
  font-weight: 500;
}

.mgl-pl-regex-valid {
  font-size: 12px;
  font-weight: 500;
  padding: 3px 12px;
  border-radius: 999px;
}

.mgl-pl-regex-flags {
  margin-left: auto;
  display: flex;
  gap: 4px;
}

.mgl-pl-regex-flagchip {
  font-family: monospace;
  font-size: 13px;
  font-weight: 700;
  width: 32px;
  height: 32px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  border: none;
}

.mgl-pl-regex-pattern {
  border: 1px solid var(--outl);
  border-radius: 12px;
  padding: 12px 14px;
  font-family: monospace;
  font-size: 15px;
  background: transparent;
  color: var(--onsurf);
  outline: none;
  width: 100%;
}

.mgl-pl-regex-error {
  font-size: 12.5px;
  color: var(--err);
  font-family: monospace;
}

.mgl-pl-regex-snippets {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.mgl-pl-regex-snippet-row {
  display: flex;
  align-items: baseline;
  gap: 8px;
  flex-wrap: wrap;
}

.mgl-pl-regex-snippet-label {
  font-size: 11px;
  font-weight: 700;
  color: var(--onsurfv);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  width: 86px;
  flex-shrink: 0;
}

.mgl-pl-regex-snippet {
  font-family: monospace;
  font-size: 12.5px;
  padding: 5px 11px;
  border-radius: 8px;
  cursor: pointer;
  background: var(--surfc);
  color: var(--onsurf);
  border: none;
}

.mgl-pl-regex-snippet:hover {
  background: var(--surfch);
}

.mgl-pl-regex-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.mgl-pl-regex-col {
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-width: 0;
}

.mgl-pl-regex-label {
  font-size: 11.5px;
  font-weight: 700;
  color: var(--onsurfv);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.mgl-pl-regex-textarea {
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

.mgl-pl-regex-highlight {
  background: var(--surfcl);
  border-radius: 12px;
  padding: 10px 12px;
  font-family: monospace;
  font-size: 12.5px;
  line-height: 1.7;
  min-height: 40px;
  word-break: break-word;
  white-space: pre-wrap;
}

.mgl-pl-regex-highlight mark {
  background: var(--primc);
  color: var(--onprimc);
  border-radius: 3px;
  padding: 0 1px;
}

.mgl-pl-regex-panel {
  background: var(--surfcl);
  border-radius: 12px;
  padding: 10px 12px;
  min-height: 40px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.mgl-pl-regex-group {
  display: flex;
  gap: 10px;
  font-size: 12.5px;
}

.mgl-pl-regex-group-n {
  font-family: monospace;
  color: var(--onprimc);
  font-weight: 700;
  width: 36px;
  flex-shrink: 0;
}

.mgl-pl-regex-nogroups {
  font-size: 12px;
  color: var(--onsurfv);
}

.mgl-pl-regex-explain {
  max-height: 120px;
  overflow-y: auto;
}

.mgl-pl-regex-explain-row {
  display: flex;
  gap: 10px;
  font-size: 12px;
}

.mgl-pl-regex-tok {
  font-family: monospace;
  color: var(--onprimc);
  flex-shrink: 0;
  min-width: 52px;
}

.mgl-pl-regex-desc {
  color: var(--onsurfv);
}

.mgl-pl-regex-corpus {
  background: var(--surfcl);
  border-radius: 14px;
  padding: 12px 14px;
  min-height: 50px;
}

.mgl-pl-regex-corpus-title {
  font-size: 11.5px;
  font-weight: 700;
  color: var(--onsurfv);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 8px;
}

.mgl-pl-regex-corpus-line {
  font-size: 12.5px;
  padding: 3px 0;
  color: var(--onsurfv);
}

.mgl-visually-hidden {
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
