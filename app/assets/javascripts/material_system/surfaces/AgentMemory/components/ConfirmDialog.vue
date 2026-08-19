<template>
  <div v-if="open" class="am-overlay-scrim" @mousedown.self="cancel">
    <div
      ref="dialog"
      class="am-confirm-dialog"
      role="alertdialog"
      aria-modal="true"
      :aria-labelledby="titleId"
      :aria-describedby="messageId"
      tabindex="-1"
      @keydown.esc="cancel"
      @keydown.tab="trapFocus"
    >
      <div class="am-confirm-dialog__header">
        <MaterialIcon name="warning" :size="22" class="am-confirm-dialog__icon" />
        <h2 :id="titleId" class="am-confirm-dialog__title">{{ title }}</h2>
      </div>
      <p :id="messageId" class="am-confirm-dialog__message">{{ message }}</p>
      <div class="am-confirm-dialog__actions">
        <button ref="cancelBtn" type="button" class="am-btn am-btn--text" @click="cancel">
          {{ cancelLabel }}
        </button>
        <button ref="confirmBtn" type="button" class="am-btn am-btn--danger" @click="confirm">
          {{ confirmLabel }}
        </button>
      </div>
    </div>
  </div>
</template>

<script>
import MaterialIcon from './MaterialIcon.vue';

let uid = 0;

export default {
  name: 'ConfirmDialog',
  components: { MaterialIcon },
  props: {
    open: {
      type: Boolean,
      default: false,
    },
    title: {
      type: String,
      default: 'Confirm',
    },
    message: {
      type: String,
      default: '',
    },
    confirmLabel: {
      type: String,
      default: 'Confirm',
    },
    cancelLabel: {
      type: String,
      default: 'Cancel',
    },
  },
  data() {
    uid += 1;
    return {
      instanceId: uid,
      returnFocusEl: null,
    };
  },
  computed: {
    titleId() {
      return `am-confirm-title-${this.instanceId}`;
    },
    messageId() {
      return `am-confirm-message-${this.instanceId}`;
    },
  },
  watch: {
    open(isOpen) {
      if (isOpen) {
        this.returnFocusEl = document.activeElement;
        this.$nextTick(() => this.$refs.dialog && this.$refs.dialog.focus());
      } else if (this.returnFocusEl && typeof this.returnFocusEl.focus === 'function') {
        this.returnFocusEl.focus();
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
    trapFocus(event) {
      const focusables = [this.$refs.cancelBtn, this.$refs.confirmBtn].filter(Boolean);
      if (focusables.length === 0) return;
      const [first, last] = [focusables[0], focusables[focusables.length - 1]];
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
