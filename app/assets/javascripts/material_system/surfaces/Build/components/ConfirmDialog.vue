<template>
  <div class="confirm-scrim" @mousedown.self="cancel">
    <div
      class="confirm-dialog"
      role="alertdialog"
      aria-modal="true"
      :aria-labelledby="titleId"
      :aria-describedby="messageId"
      @keydown.esc.stop="cancel"
    >
      <div class="confirm-dialog__header">
        <icon v-if="destructive" name="warning" class="confirm-dialog__icon" />
        <h2 :id="titleId" class="confirm-dialog__title">{{ title }}</h2>
      </div>
      <p :id="messageId" class="confirm-dialog__message">{{ message }}</p>
      <div class="confirm-dialog__actions">
        <button ref="cancelBtn" type="button" class="btn btn--text" @click="cancel">{{ cancelLabel }}</button>
        <button
          type="button"
          class="btn"
          :class="destructive ? 'btn--destructive' : 'btn--filled'"
          @click="confirm"
        >{{ confirmLabel }}</button>
      </div>
    </div>
  </div>
</template>

<script>
import Icon from './Icon.vue';

let uid = 0;

export default {
  name: 'BuildConfirmDialog',
  components: { Icon },
  props: {
    title: { type: String, required: true },
    message: { type: String, required: true },
    confirmLabel: { type: String, default: 'Confirm' },
    cancelLabel: { type: String, default: 'Cancel' },
    destructive: { type: Boolean, default: false },
  },
  data() {
    const id = (uid += 1);
    return { titleId: `confirm-title-${id}`, messageId: `confirm-message-${id}` };
  },
  mounted() {
    this.$nextTick(() => this.$refs.cancelBtn && this.$refs.cancelBtn.focus());
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
