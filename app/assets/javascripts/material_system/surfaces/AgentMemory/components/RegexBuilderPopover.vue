<template>
  <div v-if="open" class="am-overlay-scrim am-overlay-scrim--transparent" @mousedown.self="close">
    <div
      ref="popover"
      class="am-regex-popover"
      role="dialog"
      aria-modal="true"
      aria-label="Regex builder"
      :style="style"
      tabindex="-1"
      @keydown.esc="close"
    >
      <div class="am-regex-popover__header">
        <MaterialIcon name="tune" :size="18" />
        <span>Regex builder</span>
        <button type="button" class="am-icon-btn am-icon-btn--small" aria-label="Close regex builder" @click="close">
          <MaterialIcon name="close" :size="16" />
        </button>
      </div>

      <div class="am-regex-popover__body">
        <label class="am-field">
          <span class="am-field__label">Pattern</span>
          <input
            ref="patternInput"
            type="text"
            class="am-field__input am-field__input--mono"
            :value="state.pattern"
            :aria-invalid="!state.syntax.valid"
            @input="onPatternInput"
          />
        </label>

        <div class="am-regex-popover__flags" role="group" aria-label="Regex flags">
          <label v-for="flag in FLAG_OPTIONS" :key="flag.key" class="am-flag-toggle">
            <input type="checkbox" :checked="hasFlag(flag.key)" @change="toggleFlag(flag.key)" />
            {{ flag.label }}
          </label>
        </div>

        <p v-if="!state.syntax.valid" class="am-field__error" role="alert">{{ state.syntax.message }}</p>

        <label class="am-field">
          <span class="am-field__label">Sample text ({{ corpusTitle }})</span>
          <textarea class="am-field__input am-field__input--mono am-field__input--textarea" :value="state.sample" @input="onSampleInput" rows="4"></textarea>
        </label>

        <div class="am-regex-popover__matches">
          <span class="am-regex-popover__matches-count">
            {{ state.matches.length }} match{{ state.matches.length === 1 ? '' : 'es' }}
          </span>
          <ul v-if="state.matches.length" class="am-regex-popover__match-list">
            <li v-for="(match, index) in state.matches.slice(0, 25)" :key="index">
              <code>{{ match.value || '∅' }}</code>
              <span class="am-regex-popover__match-index">@{{ match.index }}</span>
            </li>
          </ul>
        </div>
      </div>

      <div class="am-regex-popover__footer">
        <button type="button" class="am-btn am-btn--text am-btn--small" @click="copy">
          <MaterialIcon name="clipboard" :size="15" /> {{ copied ? 'Copied' : 'Copy pattern' }}
        </button>
        <span class="am-regex-popover__spacer"></span>
        <button type="button" class="am-btn am-btn--text am-btn--small" @click="close">Cancel</button>
        <button
          type="button"
          class="am-btn am-btn--filled am-btn--small"
          :disabled="!state.syntax.valid || !state.pattern"
          @click="apply"
        >
          Apply
        </button>
      </div>
    </div>
  </div>
</template>

<script>
import { RegexBuilder } from '../../../regex-builder';
import MaterialIcon from './MaterialIcon.vue';

const FLAG_OPTIONS = [
  { key: 'g', label: 'Global (g)' },
  { key: 'i', label: 'Case-insensitive (i)' },
  { key: 'm', label: 'Multiline (m)' },
  { key: 's', label: 'Dot-all (s)' },
];

export default {
  name: 'RegexBuilderPopover',
  components: { MaterialIcon },
  props: {
    open: {
      type: Boolean,
      default: false,
    },
    anchor: {
      type: Object,
      default: null,
    },
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
      default: 'current results',
    },
  },
  data() {
    this.builder = new RegexBuilder();
    this.FLAG_OPTIONS = FLAG_OPTIONS;
    return {
      state: this.builder.snapshot(),
      copied: false,
      returnFocusEl: null,
    };
  },
  computed: {
    style() {
      if (!this.anchor) return {};
      const margin = 8;
      const width = 380;
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      let left = this.anchor.left;
      if (left + width + margin > viewportWidth) left = Math.max(margin, viewportWidth - width - margin);
      const top = Math.min(this.anchor.bottom + margin, viewportHeight - 200);
      const maxHeight = Math.max(viewportHeight - top - margin, 220);
      return {
        left: `${left}px`,
        top: `${Math.max(top, margin)}px`,
        width: `${width}px`,
        maxHeight: `${maxHeight}px`,
      };
    },
  },
  watch: {
    open(isOpen) {
      if (isOpen) {
        this.returnFocusEl = document.activeElement;
        this.builder = new RegexBuilder({
          pattern: this.initialPattern,
          sample: this.corpus.join('\n'),
          flags: 'gi',
          regex: true,
        });
        this.state = this.builder.snapshot();
        this.copied = false;
        this.$nextTick(() => this.$refs.patternInput && this.$refs.patternInput.focus());
      } else if (this.returnFocusEl && typeof this.returnFocusEl.focus === 'function') {
        this.returnFocusEl.focus();
      }
    },
  },
  methods: {
    hasFlag(flag) {
      return this.state.flags.includes(flag);
    },
    toggleFlag(flag) {
      const flags = this.hasFlag(flag)
        ? this.state.flags.replace(flag, '')
        : `${this.state.flags}${flag}`;
      this.state = this.builder.update({ flags });
    },
    onPatternInput(event) {
      this.state = this.builder.update({ pattern: event.target.value });
    },
    onSampleInput(event) {
      this.state = this.builder.update({ sample: event.target.value });
    },
    copy() {
      const text = this.builder.copy();
      this.copied = true;
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).catch(() => {});
      }
    },
    apply() {
      if (!this.state.syntax.valid || !this.state.pattern) return;
      this.$emit('apply', { pattern: this.state.pattern, flags: this.state.flags });
    },
    close() {
      this.$emit('close');
    },
  },
};
</script>
