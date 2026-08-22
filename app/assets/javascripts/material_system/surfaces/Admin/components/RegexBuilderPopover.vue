<template>
  <div
    v-if="open"
    ref="root"
    class="gl-mds-admin-popover gl-mds-admin-popover--regex"
    role="dialog"
    :aria-label="`Regex builder — ${label}`"
    aria-modal="false"
    @keydown.esc="$emit('close')"
  >
    <div class="gl-mds-admin-popover__header">
      <span class="gl-mds-admin-popover__title">Regex builder</span>
      <button
        type="button"
        class="gl-mds-admin-iconbtn"
        aria-label="Close regex builder"
        @click="$emit('close')"
      >
        <Icon name="close" :size="16" />
      </button>
    </div>

    <label class="gl-mds-admin-popover__field">
      <span class="gl-mds-admin-popover__label">Pattern</span>
      <input
        ref="patternInput"
        v-model="pattern"
        type="text"
        class="gl-mds-admin-input gl-mds-admin-input--mono"
        placeholder="e.g. ^prod-.*-(runner|agent)$"
        autocomplete="off"
        spellcheck="false"
        @input="evaluate"
      />
    </label>

    <fieldset class="gl-mds-admin-popover__flags">
      <legend class="gl-mds-admin-popover__label">Flags</legend>
      <label v-for="flag in FLAG_INFO" :key="flag.name" class="gl-mds-admin-flag">
        <input type="checkbox" :checked="flags.includes(flag.name)" @change="toggleFlag(flag.name)" />
        <span :title="flag.tip">{{ flag.name }}</span>
      </label>
    </fieldset>

    <p v-if="!syntax.valid" class="gl-mds-admin-popover__error" role="alert">{{ syntax.message }}</p>

    <div class="gl-mds-admin-popover__preview">
      <div class="gl-mds-admin-popover__preview-count">
        <span v-if="pattern">{{ matchedItems.length }} of {{ corpus.length }} entries match</span>
        <span v-else>Type a pattern to test it against every user, runner, and project name.</span>
      </div>
      <ul v-if="matchedItems.length" class="gl-mds-admin-popover__preview-list">
        <li v-for="item in matchedItems.slice(0, 30)" :key="item" class="gl-mds-admin-popover__preview-item">
          {{ item }}
        </li>
      </ul>
    </div>

    <div class="gl-mds-admin-popover__actions">
      <button type="button" class="gl-mds-admin-btn gl-mds-admin-btn--text" @click="$emit('close')">Cancel</button>
      <button
        type="button"
        class="gl-mds-admin-btn gl-mds-admin-btn--filled"
        :disabled="!pattern || !syntax.valid"
        @click="apply"
      >
        Apply pattern
      </button>
    </div>
  </div>
</template>

<script>
import Icon from './Icon.vue';
import RegexBuilder from '../../../regex-builder';

const FLAG_INFO = Object.freeze([
  { name: 'i', tip: 'case-insensitive' },
  { name: 'g', tip: 'global' },
  { name: 'm', tip: 'multiline' },
  { name: 's', tip: 'dotall' },
]);

export default {
  name: 'RegexBuilderPopover',
  components: { Icon },
  props: {
    open: { type: Boolean, default: false },
    initialPattern: { type: String, default: '' },
    initialFlags: { type: String, default: 'i' },
    corpus: { type: Array, default: () => [] },
    label: { type: String, required: true },
  },
  data() {
    return {
      pattern: this.initialPattern,
      flags: this.initialFlags,
      syntax: { valid: true, message: '' },
      FLAG_INFO,
    };
  },
  computed: {
    matchedItems() {
      if (!this.pattern || !this.syntax.valid) return [];
      try {
        const re = new RegExp(this.pattern, this.flags.includes('i') ? 'i' : '');
        return this.corpus.filter((item) => re.test(item));
      } catch (_error) {
        return [];
      }
    },
  },
  watch: {
    open(isOpen) {
      if (isOpen) {
        this.pattern = this.initialPattern;
        this.flags = this.initialFlags || 'i';
        this.evaluate();
        this.$nextTick(() => this.$refs.patternInput && this.$refs.patternInput.focus());
        document.addEventListener('mousedown', this.handleOutsideClick, true);
      } else {
        document.removeEventListener('mousedown', this.handleOutsideClick, true);
      }
    },
  },
  beforeDestroy() {
    document.removeEventListener('mousedown', this.handleOutsideClick, true);
  },
  methods: {
    evaluate() {
      const builder = new RegexBuilder({ pattern: this.pattern, flags: this.flags, regex: true, sample: '' });
      this.syntax = builder.state.syntax;
    },
    toggleFlag(name) {
      this.flags = this.flags.includes(name) ? this.flags.replace(name, '') : this.flags + name;
      this.evaluate();
    },
    apply() {
      this.$emit('apply', { pattern: this.pattern, flags: this.flags });
    },
    handleOutsideClick(event) {
      // Skip the trigger button itself — its own click handler owns the toggle,
      // otherwise a mousedown-driven close races the click that reopens it.
      if (event.target.closest('[data-gl-mds-admin-regex-trigger]')) return;
      if (this.$refs.root && !this.$refs.root.contains(event.target)) this.$emit('close');
    },
  },
};
</script>
