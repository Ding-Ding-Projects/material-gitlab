<template>
  <div class="gl-code-overlay" @click.self="$emit('cancel')">
    <div
      ref="panel"
      @keydown.tab="keepFocus"
      class="gl-code-dialog gl-code-dialog--confirm"
      role="alertdialog"
      aria-modal="true"
      :aria-labelledby="titleId"
      :aria-describedby="bodyId"
      @keydown.esc="$emit('cancel')"
    >
      <h2 :id="titleId" class="gl-code-dialog__title">{{ title }}</h2>
      <p :id="bodyId" class="gl-code-confirm__body">{{ body }}</p>
      <div class="gl-code-dialog__actions">
        <material-button type="button" variant="text" class="gl-code-btn gl-code-btn--text" @click="$emit('cancel')">
          Cancel
        </material-button>
        <material-button variant="filled" ref="confirmBtn" type="button" class="gl-code-btn gl-code-btn--danger" @click="$emit('confirm')">
          {{ confirmLabel }}
        </material-button>
      </div>
    </div>
  </div>
</template>

<script>
import MaterialButton from '../../../components/material_button';

let seq = 0;

export default {
  name: 'ConfirmDialog',
  components: { MaterialButton },
  props: {
    title: { type: String, required: true },
    body: { type: String, required: true },
    confirmLabel: { type: String, default: 'Delete' },
  },
  data() {
    seq += 1;
    return { uid: seq };
  },
  computed: {
    titleId() { return `gl-code-confirm-title-${this.uid}`; },
    bodyId() { return `gl-code-confirm-body-${this.uid}`; },
  },
  methods: {
    keepFocus(event) {
      const buttons = [...this.$refs.panel.querySelectorAll('md-text-button:not([disabled]), md-filled-button:not([disabled]), md-outlined-button:not([disabled]), md-filled-tonal-button:not([disabled]), md-elevated-button:not([disabled])')];
      const first = buttons[0]; const last = buttons[buttons.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    },
  },
  beforeDestroy() { if (this.previousFocus?.isConnected) this.previousFocus.focus(); },
  mounted() {
    this.previousFocus = document.activeElement;
    this.$nextTick(() => this.$refs.panel.querySelector('md-text-button, md-filled-button, md-outlined-button, md-filled-tonal-button, md-elevated-button')?.focus());
  },
};
</script>

<style lang="scss" scoped>
.gl-code-btn--danger {
  background: var(--err);
  color: var(--errc);
  border: none;
  border-radius: 999px;
  padding: 10px 22px;
  font-weight: 500;
  font-size: 13.5px;
  cursor: pointer;

  &:hover {
    filter: brightness(0.95);
  }
}
</style>
