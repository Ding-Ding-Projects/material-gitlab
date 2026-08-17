<template>
  <div class="mgl-pl-scrim" @click="$emit('cancel')" @keydown.esc="$emit('cancel')">
    <div
      ref="panel"
      class="mgl-pl-dialog mgl-pl-confirm"
      role="alertdialog"
      aria-modal="true"
      :aria-labelledby="titleId"
      :aria-describedby="messageId"
      tabindex="-1"
      @click.stop
    >
      <h2 :id="titleId">{{ title }}</h2>
      <p :id="messageId">{{ message }}</p>
      <div class="mgl-pl-confirm-actions">
        <button type="button" class="mgl-pl-text-btn" @click="$emit('cancel')">Cancel</button>
        <button type="button" class="mgl-pl-filled-btn mgl-pl-filled-btn--danger" @click="$emit('confirm')">{{ confirmLabel }}</button>
      </div>
    </div>
  </div>
</template>

<script>
let uid = 0;

export default {
  name: 'PipelinesConfirmDialog',
  props: {
    title: { type: String, required: true },
    message: { type: String, required: true },
    confirmLabel: { type: String, default: 'Confirm' },
  },
  data() {
    uid += 1;
    return { instanceId: uid };
  },
  computed: {
    titleId() {
      return `mgl-pl-confirm-title-${this.instanceId}`;
    },
    messageId() {
      return `mgl-pl-confirm-message-${this.instanceId}`;
    },
  },
  mounted() {
    this.$refs.panel.focus();
  },
};
</script>
