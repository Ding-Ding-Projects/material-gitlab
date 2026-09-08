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
      @keydown.tab="keepFocus"
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
  methods: {
    keepFocus(event) {
      const buttons = [...this.$refs.panel.querySelectorAll('button:not([disabled])')];
      const first = buttons[0]; const last = buttons[buttons.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    },
  },
  beforeDestroy() { if (this.previousFocus?.isConnected) this.previousFocus.focus(); },
  mounted() {
    this.previousFocus = document.activeElement;
    this.$nextTick(() => this.$refs.panel?.querySelector('button')?.focus());
  },
};
</script>

<style lang="scss" scoped>
.dp-confirm-scrim {
  position: fixed;
  inset: 0;
  z-index: 90;
  background: var(--dp-scrim, rgba(0, 0, 0, 0.5));
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
  background: var(--dp-card, #fff);
  color: var(--dp-onsurf, #1d1b20);
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
  color: var(--dp-onsurfv, #49454f);
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
    outline: 2px solid var(--dp-prim, #6750a4);
    outline-offset: 2px;
  }
}

.dp-btn--text {
  background: transparent;
  color: var(--dp-onsurfv, #49454f);

  &:hover {
    background: var(--dp-surfch, #e6e0e9);
  }
}

.dp-btn--danger {
  background: var(--dp-err, #b3261e);
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
