<template>
  <div
    v-if="open"
    class="mr-overlay-backdrop"
    @mousedown.self="cancel"
    @keydown.esc="cancel"
  >
    <div
      ref="panel"
      class="mr-confirm-dialog"
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="mr-confirm-dialog-title"
      aria-describedby="mr-confirm-dialog-message"
    >
      <h2 id="mr-confirm-dialog-title" class="mr-confirm-dialog__title">{{ title }}</h2>
      <p id="mr-confirm-dialog-message" class="mr-confirm-dialog__message">{{ message }}</p>
      <div class="mr-confirm-dialog__actions">
        <button ref="cancelBtn" type="button" class="mr-btn" @click="cancel">{{ cancelLabel }}</button>
        <button
          type="button"
          class="mr-btn"
          :class="danger ? 'mr-btn--danger' : 'mr-btn--primary'"
          @click="confirm"
        >
          {{ confirmLabel }}
        </button>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'MrConfirmDialog',
  props: {
    open: { type: Boolean, required: true },
    title: { type: String, required: true },
    message: { type: String, required: true },
    confirmLabel: { type: String, default: 'Confirm' },
    cancelLabel: { type: String, default: 'Cancel' },
    danger: { type: Boolean, default: true },
  },
  watch: {
    open(isOpen) {
      if (isOpen) {
        this.restoreFocusTo = document.activeElement;
        this.$nextTick(() => this.$refs.cancelBtn && this.$refs.cancelBtn.focus());
      } else if (this.restoreFocusTo && typeof this.restoreFocusTo.focus === 'function') {
        this.restoreFocusTo.focus();
      }
    },
  },
  methods: {
    confirm() {
      this.$emit('confirm');
    },
    cancel() {
      this.$emit('cancel');
    },
  },
};
</script>
