<template>
  <div v-if="open" class="gl-mds-admin-scrim" @mousedown.self="cancel">
    <div
      ref="dialog"
      class="gl-mds-admin-dialog"
      role="alertdialog"
      aria-modal="true"
      :aria-labelledby="titleId"
      :aria-describedby="descId"
      @keydown.esc="cancel"
      @keydown.tab="trapFocus"
    >
      <div class="gl-mds-admin-dialog__icon" aria-hidden="true"><Icon name="warning" :size="24" /></div>
      <h2 :id="titleId" class="gl-mds-admin-dialog__title">{{ title }}</h2>
      <p :id="descId" class="gl-mds-admin-dialog__desc">{{ description }}</p>
      <div class="gl-mds-admin-dialog__actions">
        <button ref="cancelBtn" type="button" class="gl-mds-admin-btn gl-mds-admin-btn--text" @click="cancel">
          {{ cancelLabel }}
        </button>
        <button ref="confirmBtn" type="button" class="gl-mds-admin-btn gl-mds-admin-btn--danger" @click="confirm">
          {{ confirmLabel }}
        </button>
      </div>
    </div>
  </div>
</template>

<script>
import Icon from './Icon.vue';

let uid = 0;

export default {
  name: 'ConfirmDialog',
  components: { Icon },
  props: {
    open: { type: Boolean, default: false },
    title: { type: String, required: true },
    description: { type: String, required: true },
    confirmLabel: { type: String, default: 'Confirm' },
    cancelLabel: { type: String, default: 'Cancel' },
  },
  data() {
    const id = ++uid;
    return { titleId: `gl-mds-admin-confirm-title-${id}`, descId: `gl-mds-admin-confirm-desc-${id}` };
  },
  watch: {
    open(isOpen) {
      if (isOpen) this.$nextTick(() => this.$refs.cancelBtn && this.$refs.cancelBtn.focus());
    },
  },
  methods: {
    confirm() {
      this.$emit('confirm');
    },
    cancel() {
      this.$emit('cancel');
    },
    trapFocus(event) {
      const focusable = [this.$refs.cancelBtn, this.$refs.confirmBtn].filter(Boolean);
      if (!focusable.length) return;
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
