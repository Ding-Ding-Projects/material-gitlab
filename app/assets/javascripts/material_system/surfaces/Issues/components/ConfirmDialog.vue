<template>
  <div class="gl-mds-confirm-layer" @click.self="$emit('cancel')">
    <div
      ref="panel"
      class="gl-mds-confirm"
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="gl-mds-confirm-title"
      aria-describedby="gl-mds-confirm-message"
      tabindex="-1"
      @keydown.esc="$emit('cancel')"
    >
      <h2 id="gl-mds-confirm-title" class="gl-mds-confirm__heading">{{ title }}</h2>
      <p id="gl-mds-confirm-message" class="gl-mds-confirm__message">{{ message }}</p>
      <div class="gl-mds-confirm__actions">
        <button ref="cancelButton" type="button" class="gl-mds-confirm__cancel" @click="$emit('cancel')">Cancel</button>
        <button type="button" class="gl-mds-confirm__confirm" @click="$emit('confirm')">{{ confirmLabel }}</button>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'ConfirmDialog',
  props: {
    title: { type: String, required: true },
    message: { type: String, required: true },
    confirmLabel: { type: String, default: 'Delete' },
  },
  mounted() {
    // Focus the non-destructive action first so a stray Enter cannot confirm.
    this.$refs.cancelButton.focus();
  },
};
</script>

<style scoped lang="scss">
.gl-mds-confirm-layer {
  position: fixed;
  inset: 0;
  background: var(--gl-mds-scrim);
  z-index: 55;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
}

.gl-mds-confirm {
  width: 400px;
  max-width: 100%;
  max-height: 90vh;
  overflow-y: auto;
  background: var(--gl-mds-surf);
  border-radius: 24px;
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
}

.gl-mds-confirm__heading {
  margin: 0;
  font-family: 'Google Sans', -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
  font-size: 18px;
  font-weight: 500;
  color: var(--gl-mds-err);
}

.gl-mds-confirm__message {
  margin: 0;
  font-size: 13.5px;
  line-height: 1.5;
  color: var(--gl-mds-onsurfv);
}

.gl-mds-confirm__actions {
  display: flex;
  gap: 10px;
  justify-content: flex-end;
  margin-top: 8px;
}

.gl-mds-confirm__cancel,
.gl-mds-confirm__confirm {
  padding: 10px 20px;
  border: none;
  border-radius: 999px;
  font-size: 13.5px;
  font-weight: 500;
  cursor: pointer;
  font: inherit;

  &:focus-visible {
    outline: 2px solid var(--gl-mds-prim);
    outline-offset: 2px;
  }
}

.gl-mds-confirm__cancel {
  background: var(--gl-mds-surfc);
  color: var(--gl-mds-onsurf);
}

.gl-mds-confirm__confirm {
  background: var(--gl-mds-err);
  color: var(--gl-mds-errc);
}
</style>
