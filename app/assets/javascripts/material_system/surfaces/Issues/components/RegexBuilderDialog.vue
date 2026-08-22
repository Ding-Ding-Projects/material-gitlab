<template>
  <div class="gl-mds-regex-layer" @click.self="$emit('close')">
    <div
      ref="panel"
      class="gl-mds-regex"
      role="dialog"
      aria-modal="true"
      aria-labelledby="gl-mds-regex-title"
      tabindex="-1"
      @keydown.esc="$emit('close')"
    >
      <div class="gl-mds-regex__header">
        <h2 id="gl-mds-regex-title" class="gl-mds-regex__heading">Regex builder</h2>
        <span class="gl-mds-regex__valid-badge" :class="{ 'gl-mds-regex__valid-badge--invalid': !evaluation.valid }">
          {{ validLabel }}
        </span>
        <div class="gl-mds-regex__flags" role="group" aria-label="Regex flags">
          <button
            v-for="flag in flagInfo"
            :key="flag.name"
            type="button"
            class="gl-mds-regex__flag"
            :class="{ 'gl-mds-regex__flag--on': flags[flag.name] }"
            :title="flag.tip"
            :aria-pressed="flags[flag.name]"
            :aria-label="flag.tip"
            @click="$emit('toggle-flag', flag.name)"
          >
            {{ flag.name }}
          </button>
        </div>
      </div>

      <label class="gl-mds-sr-only" for="gl-mds-regex-pattern">Regex pattern</label>
      <input
        id="gl-mds-regex-pattern"
        ref="patternInput"
        class="gl-mds-regex__pattern"
        type="text"
        :value="draft"
        placeholder="pattern, e.g. (auth|login).*fail"
        @input="$emit('update:draft', $event.target.value)"
      />
      <div v-if="!evaluation.valid" class="gl-mds-regex__error" role="alert">{{ evaluation.errorMessage }}</div>

      <div class="gl-mds-regex__snippets">
        <div v-for="group in snippetGroups" :key="group.name" class="gl-mds-regex__snippet-row">
          <span class="gl-mds-regex__snippet-label">{{ group.name }}</span>
          <button
            v-for="snippet in group.items"
            :key="snippet.text"
            type="button"
            class="gl-mds-regex__snippet"
            :title="snippet.tip"
            @click="$emit('insert-snippet', snippet.text)"
          >
            {{ snippet.text }}
          </button>
        </div>
      </div>

      <div class="gl-mds-regex__grid">
        <div class="gl-mds-regex__column">
          <span class="gl-mds-regex__column-label">Test string</span>
          <label class="gl-mds-sr-only" for="gl-mds-regex-test-text">Test string</label>
          <textarea
            id="gl-mds-regex-test-text"
            class="gl-mds-regex__test-input"
            :value="testText"
            rows="4"
            @input="$emit('update:test-text', $event.target.value)"
          ></textarea>
          <div class="gl-mds-regex__highlight">
            <template v-for="(segment, index) in evaluation.segments">
              <mark v-if="segment.matched" :key="`m-${index}`">{{ segment.text }}</mark>
              <template v-else>{{ segment.text }}</template>
            </template>
          </div>
        </div>
        <div class="gl-mds-regex__column">
          <span class="gl-mds-regex__column-label">Capture groups</span>
          <div class="gl-mds-regex__groups">
            <div v-for="group in evaluation.captureGroups" :key="group.n" class="gl-mds-regex__group-row">
              <span class="gl-mds-regex__group-name">{{ group.n }}</span>
              <span class="gl-mds-regex__group-val">{{ group.val }}</span>
            </div>
            <div v-if="!evaluation.captureGroups.length" class="gl-mds-regex__no-groups">No captures on first match.</div>
          </div>
          <span class="gl-mds-regex__column-label">Explanation</span>
          <div class="gl-mds-regex__explain">
            <div v-for="(tok, index) in evaluation.explain" :key="index" class="gl-mds-regex__explain-row">
              <span class="gl-mds-regex__explain-tok">{{ tok.tok }}</span>
              <span class="gl-mds-regex__explain-desc">{{ tok.desc }}</span>
            </div>
          </div>
        </div>
      </div>

      <div class="gl-mds-regex__preview">
        <div class="gl-mds-regex__preview-label">Matches in issues · {{ evaluation.matchCount }}</div>
        <div v-for="(line, index) in evaluation.preview" :key="index" class="gl-mds-regex__preview-line">{{ line }}</div>
      </div>

      <div class="gl-mds-regex__actions">
        <button type="button" class="gl-mds-regex__cancel" @click="$emit('close')">Cancel</button>
        <button type="button" class="gl-mds-regex__apply" :disabled="!evaluation.valid || !draft" @click="$emit('apply')">Apply to search</button>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'RegexBuilderDialog',
  props: {
    draft: { type: String, default: '' },
    flags: { type: Object, required: true },
    testText: { type: String, default: '' },
    evaluation: { type: Object, required: true },
    snippetGroups: { type: Array, required: true },
    flagInfo: { type: Array, required: true },
  },
  computed: {
    validLabel() {
      if (!this.evaluation.valid) return 'invalid';
      return this.draft ? 'valid' : 'empty';
    },
  },
  mounted() {
    this.$refs.patternInput.focus();
  },
};
</script>

<style scoped lang="scss">
.gl-mds-regex-layer {
  position: fixed;
  inset: 0;
  background: var(--gl-mds-scrim);
  z-index: 50;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
}

.gl-mds-regex {
  width: 780px;
  max-width: 100%;
  max-height: 88vh;
  overflow-y: auto;
  background: var(--gl-mds-surf);
  border-radius: 28px;
  padding: 26px;
  display: flex;
  flex-direction: column;
  gap: 14px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
}

.gl-mds-regex__header {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.gl-mds-regex__heading {
  margin: 0;
  font-family: 'Google Sans', -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
  font-size: 20px;
  font-weight: 500;
}

.gl-mds-regex__valid-badge {
  font-size: 12px;
  font-weight: 500;
  padding: 3px 12px;
  border-radius: 999px;
  background: var(--gl-mds-goodc);
  color: var(--gl-mds-good);

  &--invalid {
    background: var(--gl-mds-errc);
    color: var(--gl-mds-err);
  }
}

.gl-mds-regex__flags {
  margin-left: auto;
  display: flex;
  gap: 4px;
}

.gl-mds-regex__flag {
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
  background: var(--gl-mds-surfc);
  color: var(--gl-mds-onsurfv);

  &--on {
    background: var(--gl-mds-prim);
    color: var(--gl-mds-onprim);
  }

  &:focus-visible {
    outline: 2px solid var(--gl-mds-prim);
    outline-offset: 2px;
  }
}

.gl-mds-regex__pattern {
  border: 1px solid var(--gl-mds-outl);
  border-radius: 12px;
  padding: 12px 14px;
  font-family: monospace;
  font-size: 15px;
  background: transparent;
  color: var(--gl-mds-onsurf);
  outline: none;

  &:focus-visible {
    outline: 2px solid var(--gl-mds-prim);
    outline-offset: 1px;
  }
}

.gl-mds-regex__error {
  font-size: 12.5px;
  color: var(--gl-mds-err);
  font-family: monospace;
}

.gl-mds-regex__snippets {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.gl-mds-regex__snippet-row {
  display: flex;
  align-items: baseline;
  gap: 8px;
  flex-wrap: wrap;
}

.gl-mds-regex__snippet-label {
  font-size: 11px;
  font-weight: 700;
  color: var(--gl-mds-onsurfv);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  width: 86px;
  flex-shrink: 0;
}

.gl-mds-regex__snippet {
  font-family: monospace;
  font-size: 12.5px;
  padding: 5px 11px;
  border-radius: 8px;
  cursor: pointer;
  border: none;
  background: var(--gl-mds-surfc);
  color: var(--gl-mds-onsurf);

  &:hover { background: var(--gl-mds-surfch); }

  &:focus-visible {
    outline: 2px solid var(--gl-mds-prim);
    outline-offset: 2px;
  }
}

.gl-mds-regex__grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;

  @media (max-width: 600px) {
    grid-template-columns: 1fr;
  }
}

.gl-mds-regex__column {
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-width: 0;
}

.gl-mds-regex__column-label {
  font-size: 11.5px;
  font-weight: 700;
  color: var(--gl-mds-onsurfv);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.gl-mds-regex__test-input {
  border: 1px solid var(--gl-mds-outl);
  border-radius: 12px;
  padding: 10px 12px;
  font-family: monospace;
  font-size: 12.5px;
  background: transparent;
  color: var(--gl-mds-onsurf);
  outline: none;
  resize: vertical;

  &:focus-visible {
    outline: 2px solid var(--gl-mds-prim);
    outline-offset: 1px;
  }
}

.gl-mds-regex__highlight {
  background: var(--gl-mds-surfcl);
  border-radius: 12px;
  padding: 10px 12px;
  font-family: monospace;
  font-size: 12.5px;
  line-height: 1.7;
  min-height: 40px;
  word-break: break-word;
  white-space: pre-wrap;

  mark {
    background: var(--gl-mds-primc);
    color: var(--gl-mds-onprimc);
    border-radius: 3px;
    padding: 0 1px;
  }
}

.gl-mds-regex__groups {
  background: var(--gl-mds-surfcl);
  border-radius: 12px;
  padding: 10px 12px;
  min-height: 40px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.gl-mds-regex__group-row {
  display: flex;
  gap: 10px;
  font-size: 12.5px;
}

.gl-mds-regex__group-name {
  font-family: monospace;
  color: var(--gl-mds-onprimc);
  font-weight: 700;
  width: 36px;
}

.gl-mds-regex__no-groups {
  font-size: 12px;
  color: var(--gl-mds-onsurfv);
}

.gl-mds-regex__explain {
  background: var(--gl-mds-surfcl);
  border-radius: 12px;
  padding: 10px 12px;
  display: flex;
  flex-direction: column;
  gap: 3px;
  max-height: 120px;
  overflow-y: auto;
}

.gl-mds-regex__explain-row {
  display: flex;
  gap: 10px;
  font-size: 12px;
}

.gl-mds-regex__explain-tok {
  font-family: monospace;
  color: var(--gl-mds-onprimc);
  flex-shrink: 0;
  min-width: 52px;
}

.gl-mds-regex__explain-desc {
  color: var(--gl-mds-onsurfv);
}

.gl-mds-regex__preview {
  background: var(--gl-mds-surfcl);
  border-radius: 14px;
  padding: 12px 14px;
  min-height: 60px;
}

.gl-mds-regex__preview-label {
  font-size: 11.5px;
  font-weight: 700;
  color: var(--gl-mds-onsurfv);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 8px;
}

.gl-mds-regex__preview-line {
  font-size: 12.5px;
  padding: 3px 0;
  color: var(--gl-mds-onsurfv);
}

.gl-mds-regex__actions {
  display: flex;
  gap: 10px;
  justify-content: flex-end;
}

.gl-mds-regex__cancel,
.gl-mds-regex__apply {
  border: none;
  border-radius: 999px;
  font-size: 13.5px;
  cursor: pointer;
  font: inherit;

  &:focus-visible {
    outline: 2px solid var(--gl-mds-prim);
    outline-offset: 2px;
  }
}

.gl-mds-regex__cancel {
  padding: 10px 20px;
  background: none;
  color: var(--gl-mds-onprimc);
}

.gl-mds-regex__apply {
  padding: 10px 22px;
  font-weight: 500;
  background: var(--gl-mds-prim);
  color: var(--gl-mds-onprim);

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
}

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
