<template>
  <div
    ref="root"
    class="mr-regex-popover"
    role="region"
    aria-label="Regex builder"
    @keydown.esc="close"
  >
    <div class="mr-regex-popover__row">
      <label class="mr-regex-popover__label" :for="ids.pattern">Pattern</label>
      <input
        :id="ids.pattern"
        ref="patternInput"
        v-model="pattern"
        type="text"
        class="mr-regex-popover__input"
        placeholder="board.*virtual"
        autocomplete="off"
        spellcheck="false"
      />
      <label class="mr-regex-popover__label" :for="ids.flags">Flags</label>
      <input
        :id="ids.flags"
        v-model="flags"
        type="text"
        class="mr-regex-popover__input mr-regex-popover__flags"
        placeholder="i"
        autocomplete="off"
        spellcheck="false"
      />
    </div>
    <p class="mr-regex-popover__status" :data-valid="snapshot.syntax.valid" role="status">
      {{ snapshot.syntax.valid ? 'Valid pattern' : `Invalid pattern: ${snapshot.syntax.message}` }}
    </p>
    <div>
      <p class="mr-regex-popover__label">{{ matchSummary }}</p>
      <div v-if="matchingRows.length" class="mr-regex-popover__matches">
        <span v-for="row in matchingRows" :key="row" class="mr-regex-popover__match">{{ row }}</span>
      </div>
    </div>
    <div class="mr-regex-popover__actions">
      <button type="button" class="mr-btn" @click="copyPattern">Copy pattern</button>
      <button type="button" class="mr-btn" @click="close">Cancel</button>
      <button
        type="button"
        class="mr-btn mr-btn--primary"
        :disabled="!snapshot.syntax.valid || !pattern"
        @click="apply"
      >
        Apply to search
      </button>
    </div>
  </div>
</template>

<script>
import RegexBuilder from '~/material_system/regex-builder';

let uid = 0;

export default {
  name: 'MrRegexPopover',
  props: {
    initialPattern: { type: String, default: '' },
    corpus: { type: Array, default: () => [] },
    corpusTitle: { type: String, default: 'Matches in merge requests' },
    // The button that opens this popover; excluded from the outside-click close check so
    // clicking it again toggles closed instead of racing the mousedown-triggered close.
    triggerEl: { type: HTMLElement, default: null },
  },
  data() {
    uid += 1;
    return {
      ids: { pattern: `mr-regex-pattern-${uid}`, flags: `mr-regex-flags-${uid}` },
      builder: new RegexBuilder({ pattern: this.initialPattern, flags: 'i', regex: true, sample: this.corpus.join('\n') }),
      snapshot: null,
    };
  },
  computed: {
    pattern: {
      get() {
        return this.snapshot.pattern;
      },
      set(value) {
        this.snapshot = this.builder.update({ pattern: value });
      },
    },
    flags: {
      get() {
        return this.snapshot.flags;
      },
      set(value) {
        this.snapshot = this.builder.update({ flags: value });
      },
    },
    matchingRows() {
      if (!this.snapshot.syntax.valid || !this.pattern) return [];
      let expression;
      try {
        expression = new RegExp(this.pattern, this.flags);
      } catch (_error) {
        return [];
      }
      return this.corpus.filter((row) => expression.test(row)).slice(0, 8);
    },
    matchSummary() {
      if (!this.pattern) return `${this.corpusTitle} — start typing a pattern`;
      const total = this.corpus.filter((row) => {
        if (!this.snapshot.syntax.valid) return false;
        try {
          return new RegExp(this.pattern, this.flags).test(row);
        } catch (_error) {
          return false;
        }
      }).length;
      return `${this.corpusTitle} — matches ${total} of ${this.corpus.length}`;
    },
  },
  created() {
    this.snapshot = this.builder.snapshot();
  },
  mounted() {
    this.restoreFocusTo = document.activeElement;
    this.$nextTick(() => this.$refs.patternInput && this.$refs.patternInput.focus());
    this.onDocumentDown = (event) => {
      const insidePopover = this.$refs.root && this.$refs.root.contains(event.target);
      const onTrigger = this.triggerEl && this.triggerEl.contains(event.target);
      if (!insidePopover && !onTrigger) this.close();
    };
    document.addEventListener('mousedown', this.onDocumentDown);
  },
  beforeDestroy() {
    document.removeEventListener('mousedown', this.onDocumentDown);
    if (this.restoreFocusTo && typeof this.restoreFocusTo.focus === 'function') {
      this.restoreFocusTo.focus();
    }
  },
  methods: {
    async copyPattern() {
      const text = this.builder.copy();
      if (navigator.clipboard && navigator.clipboard.writeText) {
        try {
          await navigator.clipboard.writeText(text);
        } catch (_error) {
          // Clipboard access can be denied by the browser; the pattern remains visible to copy manually.
        }
      }
    },
    apply() {
      if (!this.snapshot.syntax.valid || !this.pattern) return;
      this.$emit('apply', { pattern: this.pattern, flags: this.flags });
    },
    close() {
      this.$emit('close');
    },
  },
};
</script>
