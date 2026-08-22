<template>
  <div class="dp-confirm-scrim" @click.self="$emit('cancel')">
    <div
      ref="panel"
      class="dp-confirm"
      role="alertdialog"
      aria-modal="true"
      :aria-labelledby="titleId"
      :aria-describedby="messageId"
      tabindex="-1"
      @keydown.esc="$emit('cancel')"
      @click.stop
    >
      <h2 :id="titleId" class="dp-confirm__title">{{ title }}</h2>
      <p :id="messageId" class="dp-confirm__message">{{ message }}</p>
      <div class="dp-confirm__actions">
        <button type="button" class="dp-btn dp-btn--text" @click="$emit('cancel')">Cancel</button>
        <button ref="confirmButton" type="button" class="dp-btn dp-btn--danger" @click="$emit('confirm')">
          {{ confirmLabel }}
        </button>
      </div>
    </div>
  </div>
</template>

<script>
let uid = 0;

export default {
  name: 'DeployConfirmDialog',
  props: {
    title: { type: String, required: true },
    message: { type: String, required: true },
    confirmLabel: { type: String, default: 'Delete' },
  },
  data() {
    uid += 1;
    return { instanceId: uid };
  },
  computed: {
    titleId() {
      return `dp-confirm-title-${this.instanceId}`;
    },
    messageId() {
      return `dp-confirm-message-${this.instanceId}`;
    },
  },
  mounted() {
    this.$nextTick(() => this.$refs.confirmButton && this.$refs.confirmButton.focus());
  },
};
</script>

<style lang="scss" scoped>
.dp-confirm-scrim {
  position: fixed;
  inset: 0;
  z-index: 90;
  background: var(--dp-scrim);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
}

.dp-confirm {
  width: 100%;
  max-width: 420px;
  max-height: calc(100vh - 48px);
  overflow-y: auto;
  background: var(--dp-card);
  color: var(--dp-onsurf);
  border-radius: 20px;
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.3);
  padding: 24px;
}

.dp-confirm__title {
  margin: 0 0 8px;
  font-size: 18px;
  font-weight: 500;
}

.dp-confirm__message {
  margin: 0 0 20px;
  font-size: 13.5px;
  line-height: 1.5;
  color: var(--dp-onsurfv);
}

.dp-confirm__actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

.dp-btn {
  border-radius: 999px;
  padding: 9px 18px;
  font: inherit;
  font-weight: 600;
  font-size: 13px;
  cursor: pointer;
  border: none;

  &:focus-visible {
    outline: 2px solid var(--dp-prim);
    outline-offset: 2px;
  }
}

.dp-btn--text {
  background: transparent;
  color: var(--dp-onsurfv);

  &:hover {
    background: var(--dp-surfch);
  }
}

.dp-btn--danger {
  background: var(--dp-err);
  color: var(--dp-onprim, #fff);

  &:hover {
    filter: brightness(1.08);
  }
}

@media (prefers-reduced-motion: no-preference) {
  .dp-confirm {
    animation: dp-confirm-in 120ms ease-out;
  }
}

@keyframes dp-confirm-in {
  from {
    opacity: 0;
    transform: translateY(6px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>
