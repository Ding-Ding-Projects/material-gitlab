<script>
import RegexBuilder from '../../../regex-builder';
import notificationCenter from '../../../notifications';
import MaterialIcon from './icons/MaterialIcon.vue';
import trapFocus from '../focus_trap';

const FLAG_OPTIONS = [
  { flag: 'g', label: 'Global — find every match' },
  { flag: 'i', label: 'Case-insensitive' },
  { flag: 'm', label: 'Multiline — ^ and $ match line boundaries' },
  { flag: 's', label: 'Dot matches newline' },
];

/**
 * Anchored regex builder, ported from the design's `dc-import name="Regex Builder"`.
 * Owns its own RegexBuilder instance (plain-text default, regex opt-in) and tests
 * live against the corpus of visible vulnerabilities passed in by the parent.
 */
export default {
  name: 'RegexBuilderPopover',
  components: { MaterialIcon },
  flagOptions: FLAG_OPTIONS,
  props: {
    initialPattern: {
      type: String,
      required: false,
      default: '',
    },
    corpus: {
      type: Array,
      required: true,
    },
    corpusTitle: {
      type: String,
      required: false,
      default: 'Matches in corpus',
    },
  },
  data() {
    const builder = new RegexBuilder({
      pattern: this.initialPattern,
      sample: this.corpus.join('\n'),
      flags: '',
      regex: Boolean(this.initialPattern),
    });
    return {
      builder,
      view: builder.snapshot(),
    };
  },
  computed: {
    corpusLines() {
      return this.corpus;
    },
    canApply() {
      return this.view.pattern.length > 0 && this.view.syntax.valid;
    },
  },
  mounted() {
    this.releaseTrap = trapFocus(this.$el, { initialFocus: '.sec-regex-popover__pattern' });
    document.addEventListener('keydown', this.onKeydown);
  },
  beforeDestroy() {
    document.removeEventListener('keydown', this.onKeydown);
    if (this.releaseTrap) this.releaseTrap();
  },
  methods: {
    onKeydown(event) {
      if (event.key === 'Escape') this.$emit('close');
    },
    onScrimClick() {
      this.$emit('close');
    },
    onPatternInput(event) {
      this.view = this.builder.update({ pattern: event.target.value });
    },
    onModeToggle(useRegex) {
      this.view = this.builder.update({ regex: useRegex });
    },
    onFlagToggle(flag) {
      const flags = this.view.flags.includes(flag)
        ? this.view.flags.replace(flag, '')
        : this.view.flags + flag;
      this.view = this.builder.update({ flags });
    },
    hasFlag(flag) {
      return this.view.flags.includes(flag);
    },
    lineMatchCount(line) {
      if (!this.view.syntax.valid || !this.view.pattern) return 0;
      return this.view.matches.filter((match) => line.includes(match.value) || match.value === '').length;
    },
    async onCopy() {
      const text = this.builder.copy();
      this.view = this.builder.snapshot();
      try {
        if (navigator.clipboard && navigator.clipboard.writeText) {
          await navigator.clipboard.writeText(text);
        }
        notificationCenter.notify({ title: 'Copied', message: 'Pattern copied to clipboard.', severity: 'success' });
      } catch (_error) {
        notificationCenter.notify({
          title: 'Copy failed',
          message: 'Could not write to the clipboard. Select and copy the pattern manually.',
          severity: 'warning',
        });
      }
    },
    onExport() {
      const json = this.builder.exportState();
      this.view = this.builder.snapshot();
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'vulnerability-search-pattern.json';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      notificationCenter.notify({ title: 'Exported', message: 'Pattern exported as JSON.', severity: 'success' });
    },
    onApply() {
      if (!this.canApply) return;
      this.$emit('apply', this.view.pattern);
    },
  },
};
</script>

<template>
  <div>
    <div class="sec-scrim sec-scrim--light" @click="onScrimClick"></div>
    <div class="sec-regex-popover" role="dialog" aria-modal="true" aria-label="Regex builder">
      <div class="sec-regex-popover__header">
        <h3>Regex builder</h3>
        <button type="button" class="sec-icon-button" aria-label="Close regex builder" @click="$emit('close')">
          <material-icon name="close" />
        </button>
      </div>

      <div class="sec-regex-popover__mode" role="group" aria-label="Search mode">
        <button
          type="button"
          class="sec-segmented"
          :class="{ 'sec-segmented--active': !view.regex }"
          :aria-pressed="!view.regex"
          @click="onModeToggle(false)"
        >
          Plain text
        </button>
        <button
          type="button"
          class="sec-segmented"
          :class="{ 'sec-segmented--active': view.regex }"
          :aria-pressed="view.regex"
          @click="onModeToggle(true)"
        >
          Regex
        </button>
      </div>

      <label class="sec-field">
        <span class="sec-field__label">Pattern</span>
        <input
          class="sec-input sec-regex-popover__pattern"
          type="text"
          :value="view.pattern"
          spellcheck="false"
          autocomplete="off"
          :aria-invalid="!view.syntax.valid"
          @input="onPatternInput"
        />
      </label>

      <div v-if="view.regex" class="sec-regex-popover__flags">
        <span class="sec-field__label">Flags</span>
        <label v-for="option in $options.flagOptions" :key="option.flag" class="sec-regex-popover__flag">
          <input
            type="checkbox"
            class="sec-checkbox"
            :checked="hasFlag(option.flag)"
            @change="onFlagToggle(option.flag)"
          />
          <span :title="option.label">{{ option.flag }}</span>
        </label>
      </div>

      <p v-if="!view.syntax.valid" class="sec-regex-popover__error" role="alert">{{ view.syntax.message }}</p>

      <div class="sec-regex-popover__corpus">
        <span class="sec-field__label">{{ corpusTitle }}</span>
        <ul class="sec-regex-popover__corpus-list">
          <li v-for="(line, index) in corpusLines" :key="index" class="sec-regex-popover__corpus-line">
            <span
              class="sec-regex-popover__corpus-count"
              :class="{ 'sec-regex-popover__corpus-count--zero': lineMatchCount(line) === 0 }"
            >
              {{ lineMatchCount(line) }}
            </span>
            <span>{{ line }}</span>
          </li>
        </ul>
      </div>

      <div v-if="view.matches.length > 0" class="sec-regex-popover__matches">
        <span class="sec-field__label">{{ view.matches.length }} match(es)</span>
        <ul>
          <li v-for="(match, index) in view.matches" :key="index">
            <code>{{ match.value || '(empty match)' }}</code> at index {{ match.index }}
          </li>
        </ul>
      </div>

      <div class="sec-regex-popover__footer">
        <button type="button" class="sec-text-button" @click="onCopy">
          <material-icon name="copy" :size="16" />
          Copy
        </button>
        <button type="button" class="sec-text-button" @click="onExport">
          <material-icon name="download" :size="16" />
          Export
        </button>
        <span class="sec-regex-popover__spacer"></span>
        <button type="button" class="sec-text-button" @click="$emit('close')">Cancel</button>
        <button type="button" class="sec-button" :disabled="!canApply" @click="onApply">Apply</button>
      </div>
    </div>
  </div>
</template>
