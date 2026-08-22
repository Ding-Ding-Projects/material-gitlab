<template>
  <div class="gl-code-overlay" @click.self="$emit('cancel')">
    <div
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
        <button type="button" class="gl-code-btn gl-code-btn--text" @click="$emit('cancel')">
          Cancel
        </button>
        <button ref="confirmBtn" type="button" class="gl-code-btn gl-code-btn--danger" @click="$emit('confirm')">
          {{ confirmLabel }}
        </button>
      </div>
    </div>
  </div>
</template>

<script>
let seq = 0;

export default {
  name: 'ConfirmDialog',
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
  mounted() {
    this.$nextTick(() => this.$refs.confirmBtn && this.$refs.confirmBtn.focus());
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
