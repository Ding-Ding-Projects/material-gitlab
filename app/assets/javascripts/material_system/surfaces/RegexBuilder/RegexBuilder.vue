<template>
  <div class="material-regex-builder__scrim" role="presentation" @click.self="$emit('close')">
    <section ref="dialog" class="material-regex-builder" data-regex-builder-target role="dialog" aria-modal="true" aria-labelledby="material-regex-title">
      <div class="material-regex-builder__heading">
        <h2 id="material-regex-title">Regex builder</h2>
        <span class="material-regex-builder__validity" :class="{ 'is-invalid': !state.syntax.valid }">{{ state.syntax.valid ? (state.regex ? 'valid regex' : 'plain text') : 'invalid pattern' }}</span>
        <button type="button" aria-label="Close regex builder" @click="$emit('close')">×</button>
      </div>
      <label :for="patternId">Pattern for {{ targetLabel }}</label>
      <input :id="patternId" ref="pattern" v-model="pattern" class="material-regex-builder__pattern" type="text" autocomplete="off" @input="evaluate" />
      <p v-if="!state.syntax.valid" class="material-regex-builder__error" role="alert">{{ state.syntax.message }}</p>
      <div class="material-regex-builder__flags" aria-label="Regex flags">
        <label v-for="flag in availableFlags" :key="flag"><input v-model="flags" type="checkbox" :value="flag" @change="evaluate" /> {{ flag }}</label>
        <label><input v-model="regex" type="checkbox" @change="evaluate" /> Regex mode</label>
      </div>
      <label :for="sampleId">Test string</label>
      <textarea :id="sampleId" v-model="sample" rows="4" @input="evaluate" />
      <div class="material-regex-builder__matches" role="status">
        <strong>{{ state.matches.length }} match{{ state.matches.length === 1 ? '' : 'es' }}</strong>
        <span v-for="match in state.matches" :key="`${match.index}-${match.value}`">{{ match.value || '∅' }}</span>
      </div>
      <div class="material-regex-builder__actions">
        <button type="button" @click="$emit('close')">Cancel</button>
        <button type="button" :disabled="!state.syntax.valid" @click="apply">Apply to search</button>
      </div>
    </section>
  </div>
</template>

<script>
import { RegexBuilder } from '../../regex-builder';

export default {
  name: 'MaterialRegexBuilder',
  props: { initial: { type: String, default: '' }, corpus: { type: Array, default: () => [] }, targetLabel: { type: String, default: 'search' } },
  data() { const builder = new RegexBuilder({ pattern: this.initial, sample: this.corpus.join('\n') }); return { builder, pattern: this.initial, sample: this.corpus.join('\n'), flags: [], regex: false, state: builder.snapshot() }; },
  computed: { patternId() { return `material-regex-pattern-${this._uid}`; }, sampleId() { return `material-regex-sample-${this._uid}`; }, availableFlags() { return ['i', 'g', 'm', 's']; } },
  mounted() { this.$nextTick(() => this.$refs.pattern?.focus()); this.previousFocus = document.activeElement; },
  beforeDestroy() { this.previousFocus?.focus?.(); },
  methods: {
    evaluate() { this.state = this.builder.update({ pattern: this.pattern, sample: this.sample, flags: this.flags.join(''), regex: this.regex }); },
    apply() { this.$emit('apply', { pattern: this.pattern, flags: this.flags.join(''), regex: this.regex }); },
  },
};
</script>

<style lang="scss" src="../shared-shell.scss"></style>
