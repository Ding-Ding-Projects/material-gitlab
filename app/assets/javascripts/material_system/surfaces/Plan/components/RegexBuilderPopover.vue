<template>
  <div class="gl-mds-regexpop-layer">
    <div
      ref="panel"
      class="gl-mds-regexpop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="gl-mds-regexpop-title"
      tabindex="-1"
      @keydown.esc="$emit('close')"
      @keydown.tab="trapFocus"
    >
      <div class="gl-mds-regexpop__head">
        <h2 id="gl-mds-regexpop-title" class="gl-mds-regexpop__heading">Regex builder</h2>
        <span class="gl-mds-regexpop__valid" :class="draft.valid ? 'gl-mds-regexpop__valid--ok' : 'gl-mds-regexpop__valid--bad'">
          {{ validLabel }}
        </span>
        <div class="gl-mds-regexpop__flags">
          <material-button variant="text"
            v-for="flag in flagInfo"
            :key="flag.name"
            type="button"
            class="gl-mds-regexpop__flag"
            :class="{ 'gl-mds-regexpop__flag--on': flags[flag.name] }"
            :title="flag.tip"
            :aria-pressed="!!flags[flag.name]"
            @click="toggleFlag(flag.name)"
          >
            {{ flag.name }}
          </material-button>
        </div>
        <material-button variant="text" type="button" class="gl-mds-plan__icon-btn" aria-label="Close regex builder" @click="$emit('close')">
          <mds-icon name="close" size="sm" />
        </material-button>
      </div>

      <label class="gl-mds-sr-only" for="gl-mds-regexpop-pattern">Pattern</label>
      <material-text-field
        id="gl-mds-regexpop-pattern"
        ref="patternInput"
        v-model="pattern"
        class="gl-mds-regexpop__input"
        placeholder="pattern, e.g. (17\.\d|Sprint \d+)"
        spellcheck="false"
      aria-label="Pattern" />
      <div v-if="!draft.valid" class="gl-mds-regexpop__error" role="alert">{{ draft.errorMessage }}</div>

      <div class="gl-mds-regexpop__snippets">
        <div v-for="group in snippetGroups" :key="group.name" class="gl-mds-regexpop__snippet-row">
          <span class="gl-mds-regexpop__snippet-label">{{ group.name }}</span>
          <material-button variant="text"
            v-for="snippet in group.items"
            :key="snippet.text"
            type="button"
            class="gl-mds-regexpop__snippet"
            :title="snippet.tip"
            @click="insertSnippet(snippet.text)"
          >
            {{ snippet.text }}
          </material-button>
        </div>
      </div>

      <div class="gl-mds-regexpop__grid">
        <div class="gl-mds-regexpop__col">
          <span class="gl-mds-regexpop__label">Test string</span>
          <material-text-field type="textarea" aria-label="Test string" v-model="testText" class="gl-mds-regexpop__textarea" rows="3"></material-text-field>
          <div class="gl-mds-regexpop__highlight">
            <template v-for="(segment, index) in draft.segments">
              <mark v-if="segment.matched" :key="index" class="gl-mds-regexpop__mark">{{ segment.text }}</mark>
              <template v-else>{{ segment.text }}</template>
            </template>
          </div>
        </div>
        <div class="gl-mds-regexpop__col">
          <span class="gl-mds-regexpop__label">Capture groups</span>
          <div class="gl-mds-regexpop__box">
            <div v-for="group in draft.captureGroups" :key="group.n" class="gl-mds-regexpop__group-row">
              <span class="gl-mds-regexpop__group-n">{{ group.n }}</span><span>{{ group.val }}</span>
            </div>
            <div v-if="draft.captureGroups.length === 0" class="gl-mds-regexpop__muted">No captures on first match.</div>
          </div>
        </div>
      </div>

      <div class="gl-mds-regexpop__corpus">
        <div class="gl-mds-regexpop__label">{{ corpusTitle }} · {{ draft.matchCount }}</div>
        <div v-for="(item, index) in draft.preview" :key="index" class="gl-mds-regexpop__corpus-item">{{ item }}</div>
        <div v-if="pattern && draft.preview.length === 0" class="gl-mds-regexpop__muted">No matches.</div>
      </div>

      <div class="gl-mds-regexpop__actions">
        <material-button variant="text" type="button" class="gl-mds-regexpop__cancel" @click="$emit('close')">Cancel</material-button>
        <material-button variant="filled" type="button" class="gl-mds-regexpop__apply" :disabled="!pattern || !draft.valid" @click="apply">Apply to search</material-button>
      </div>
    </div>
  </div>
</template>

<script>
import MaterialButton from '~/material_system/components/material_button';
import MaterialTextField from '~/material_system/components/material_text_field';

import MdsIcon from './MdsIcon.vue';
import { REGEX_FLAG_INFO, SNIPPET_GROUPS, evaluateRegexDraft } from '../regexPlanSearch';

export default {
  name: 'RegexBuilderPopover',
  components: { MaterialButton, MaterialTextField, MdsIcon },
  props: {
    initial: { type: String, default: '' },
    corpus: { type: Array, default: () => [] },
    corpusTitle: { type: String, default: 'Matches' },
  },
  data() {
    return {
      pattern: this.initial,
      flags: { i: true, g: true, m: false, s: false },
      testText: 'Sprint 34 opened Aug 11 — REQ-3 still failed, milestone 17.3 at 45%.',
    };
  },
  computed: {
    flagInfo() {
      return REGEX_FLAG_INFO;
    },
    snippetGroups() {
      return SNIPPET_GROUPS;
    },
    draft() {
      return evaluateRegexDraft({ pattern: this.pattern, flags: this.flags, testText: this.testText, corpus: this.corpus });
    },
    validLabel() {
      if (!this.pattern) return 'empty';
      return this.draft.valid ? 'valid' : 'invalid';
    },
  },
  mounted() {
    this.$refs.patternInput.focus();
    this.handleOutsideClick = (event) => {
      if (this.$refs.panel && !this.$refs.panel.contains(event.target)) this.$emit('close');
    };
    document.addEventListener('mousedown', this.handleOutsideClick);
  },
  beforeDestroy() {
    document.removeEventListener('mousedown', this.handleOutsideClick);
  },
  methods: {
    toggleFlag(name) {
      this.flags = { ...this.flags, [name]: !this.flags[name] };
    },
    insertSnippet(text) {
      this.pattern += text.replace(/ /g, '');
      this.$refs.patternInput.focus();
    },
    apply() {
      if (!this.pattern || !this.draft.valid) return;
      this.$emit('apply', this.pattern);
    },
    trapFocus(event) {
      const focusable = this.$refs.panel.querySelectorAll('button:not([disabled]), md-text-button:not([disabled]), md-filled-button:not([disabled]), md-filled-text-field:not([disabled]), [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    },
  },
};
</script>

<style scoped lang="scss">
.gl-mds-regexpop-layer {
  position: absolute;
  top: 100%;
  left: 0;
  margin-top: 8px;
  z-index: 60;
}

.gl-mds-regexpop {
  width: min(640px, 90vw);
  max-height: min(72vh, 640px);
  overflow-y: auto;
  background: var(--gl-mds-surf);
  border-radius: 20px;
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.28);
  border: 1px solid var(--gl-mds-outlv);
}

.gl-mds-regexpop__head {
  display: flex;
  align-items: center;
  gap: 10px;
}

.gl-mds-regexpop__heading {
  margin: 0;
  font-family: 'Google Sans', -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
  font-size: 17px;
  font-weight: 500;
}

.gl-mds-regexpop__valid {
  font-size: 11.5px;
  font-weight: 500;
  padding: 3px 10px;
  border-radius: 999px;

  &--ok { background: var(--gl-mds-goodc); color: var(--gl-mds-good); }
  &--bad { background: var(--gl-mds-errc); color: var(--gl-mds-err); }
}

.gl-mds-regexpop__flags {
  margin-left: auto;
  display: flex;
  gap: 4px;
}

.gl-mds-regexpop__flag {
  font-family: monospace;
  font-size: 12px;
  font-weight: 700;
  width: 28px;
  height: 28px;
  border-radius: 7px;
  border: none;
  cursor: pointer;
  background: var(--gl-mds-surfc);
  color: var(--gl-mds-onsurfv);

  &--on { background: var(--gl-mds-prim); color: var(--gl-mds-onprim); }
  &:focus-visible { outline: 2px solid var(--gl-mds-prim); outline-offset: 2px; }
}

.gl-mds-regexpop__input {
  border: 1px solid var(--gl-mds-outl);
  border-radius: 10px;
  padding: 10px 12px;
  font-family: monospace;
  font-size: 14px;
  background: transparent;
  color: var(--gl-mds-onsurf);
  outline: none;

  &:focus-visible { outline: 2px solid var(--gl-mds-prim); outline-offset: 1px; }
}

.gl-mds-regexpop__error {
  font-size: 12px;
  color: var(--gl-mds-err);
  font-family: monospace;
}

.gl-mds-regexpop__snippets {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.gl-mds-regexpop__snippet-row {
  display: flex;
  align-items: baseline;
  gap: 6px;
  flex-wrap: wrap;
}

.gl-mds-regexpop__snippet-label {
  font-size: 10.5px;
  font-weight: 700;
  color: var(--gl-mds-onsurfv);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  width: 74px;
  flex-shrink: 0;
}

.gl-mds-regexpop__snippet {
  font-family: monospace;
  font-size: 12px;
  padding: 4px 9px;
  border-radius: 7px;
  border: none;
  cursor: pointer;
  background: var(--gl-mds-surfc);
  color: var(--gl-mds-onsurf);

  &:hover { background: var(--gl-mds-surfch); }
  &:focus-visible { outline: 2px solid var(--gl-mds-prim); outline-offset: 1px; }
}

.gl-mds-regexpop__grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.gl-mds-regexpop__col {
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 0;
}

.gl-mds-regexpop__label {
  font-size: 11px;
  font-weight: 700;
  color: var(--gl-mds-onsurfv);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.gl-mds-regexpop__textarea {
  border: 1px solid var(--gl-mds-outl);
  border-radius: 10px;
  padding: 8px 10px;
  font-family: monospace;
  font-size: 12px;
  background: transparent;
  color: var(--gl-mds-onsurf);
  outline: none;
  resize: vertical;

  &:focus-visible { outline: 2px solid var(--gl-mds-prim); outline-offset: 1px; }
}

.gl-mds-regexpop__highlight,
.gl-mds-regexpop__box {
  background: var(--gl-mds-surfcl);
  border-radius: 10px;
  padding: 8px 10px;
  font-family: monospace;
  font-size: 12px;
  line-height: 1.6;
  min-height: 36px;
  word-break: break-word;
  white-space: pre-wrap;
}

.gl-mds-regexpop__mark {
  background: var(--gl-mds-primc);
  color: var(--gl-mds-onprimc);
  border-radius: 3px;
  padding: 0 1px;
}

.gl-mds-regexpop__group-row {
  display: flex;
  gap: 8px;
  font-size: 12px;
}

.gl-mds-regexpop__group-n {
  color: var(--gl-mds-onprimc);
  font-weight: 700;
  width: 32px;
  flex-shrink: 0;
}

.gl-mds-regexpop__muted {
  font-size: 11.5px;
  color: var(--gl-mds-onsurfv);
}

.gl-mds-regexpop__corpus {
  background: var(--gl-mds-surfcl);
  border-radius: 12px;
  padding: 10px 12px;
}

.gl-mds-regexpop__corpus-item {
  font-size: 12px;
  padding: 2px 0;
  color: var(--gl-mds-onsurfv);
}

.gl-mds-regexpop__actions {
  display: flex;
  gap: 8px;
  justify-content: flex-end;
}

.gl-mds-regexpop__cancel,
.gl-mds-regexpop__apply {
  padding: 9px 18px;
  border: none;
  border-radius: 999px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  font: inherit;

  &:focus-visible { outline: 2px solid var(--gl-mds-prim); outline-offset: 2px; }
  &:disabled { opacity: 0.5; cursor: not-allowed; }
}

.gl-mds-regexpop__cancel { background: none; color: var(--gl-mds-onprimc); }
.gl-mds-regexpop__apply { background: var(--gl-mds-prim); color: var(--gl-mds-onprim); }

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

@media (max-width: 640px) {
  .gl-mds-regexpop__grid { grid-template-columns: 1fr; }
}
</style>
