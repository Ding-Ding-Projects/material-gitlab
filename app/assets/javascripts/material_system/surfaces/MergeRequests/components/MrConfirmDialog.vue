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
        <material-button variant="text" ref="cancelBtn" type="button" class="mr-btn" @click="cancel">{{ cancelLabel }}</material-button>
        <material-button variant="filled"
          type="button"
          class="mr-btn"
          :class="danger ? 'mr-btn--danger' : 'mr-btn--primary'"
          @click="confirm"
        >
          {{ confirmLabel }}
        </material-button>
      </div>
    </div>
  </div>
</template>

<script>
import MaterialButton from '~/material_system/components/material_button';

export default {
  components: { MaterialButton },
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
