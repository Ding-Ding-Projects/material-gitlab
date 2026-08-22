<template>
  <div class="gl-mds-dialog-layer" @click.self="$emit('cancel')">
    <div
      ref="panel"
      class="gl-mds-dialog"
      role="dialog"
      aria-modal="true"
      aria-labelledby="gl-mds-new-issue-title"
      tabindex="-1"
    >
      <h2 id="gl-mds-new-issue-title" class="gl-mds-dialog__heading">New issue</h2>
      <label class="gl-mds-sr-only" for="gl-mds-new-issue-title-input">Title</label>
      <input
        id="gl-mds-new-issue-title-input"
        ref="titleInput"
        class="gl-mds-dialog__input"
        type="text"
        :value="titleValue"
        placeholder="Title"
        @input="$emit('update:title', $event.target.value)"
        @keydown.esc="$emit('cancel')"
      />
      <label class="gl-mds-sr-only" for="gl-mds-new-issue-body-input">Description (optional)</label>
      <textarea
        id="gl-mds-new-issue-body-input"
        class="gl-mds-dialog__textarea"
        :value="bodyValue"
        placeholder="Description (optional)"
        rows="4"
        @input="$emit('update:body', $event.target.value)"
        @keydown.esc="$emit('cancel')"
      ></textarea>
      <div class="gl-mds-dialog__actions">
        <button type="button" class="gl-mds-dialog__cancel" @click="$emit('cancel')">Cancel</button>
        <button type="button" class="gl-mds-dialog__confirm" :disabled="!titleValue.trim()" @click="$emit('create')">Create issue</button>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'NewIssueDialog',
  props: {
    titleValue: { type: String, default: '' },
    bodyValue: { type: String, default: '' },
  },
  mounted() {
    this.$refs.titleInput.focus();
  },
};
</script>

<style scoped lang="scss">
.gl-mds-dialog-layer {
  position: fixed;
  inset: 0;
  background: var(--gl-mds-scrim);
  z-index: 50;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
}

.gl-mds-dialog {
  width: 480px;
  max-width: 100%;
  max-height: 90vh;
  overflow-y: auto;
  background: var(--gl-mds-surf);
  border-radius: 28px;
  padding: 26px;
  display: flex;
  flex-direction: column;
  gap: 14px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
}

.gl-mds-dialog__heading {
  margin: 0;
  font-family: 'Google Sans', -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
  font-size: 20px;
  font-weight: 500;
}

.gl-mds-dialog__input,
.gl-mds-dialog__textarea {
  border: 1px solid var(--gl-mds-outl);
  border-radius: 12px;
  padding: 12px 14px;
  font: inherit;
  background: transparent;
  color: var(--gl-mds-onsurf);
  outline: none;

  &:focus-visible {
    outline: 2px solid var(--gl-mds-prim);
    outline-offset: 1px;
  }
}

.gl-mds-dialog__input { font-size: 14px; }
.gl-mds-dialog__textarea { font-size: 13.5px; resize: vertical; }

.gl-mds-dialog__actions {
  display: flex;
  gap: 10px;
  justify-content: flex-end;
}

.gl-mds-dialog__cancel,
.gl-mds-dialog__confirm {
  border: none;
  border-radius: 999px;
  font-size: 13.5px;
  cursor: pointer;
  font: inherit;

  &:focus-visible {
    outline: 2px solid var(--gl-mds-prim);
    outline-offset: 2px;
  }
}

.gl-mds-dialog__cancel {
  padding: 10px 20px;
  background: none;
  color: var(--gl-mds-onprimc);
}

.gl-mds-dialog__confirm {
  padding: 10px 22px;
  font-weight: 500;
  background: var(--gl-mds-prim);
  color: var(--gl-mds-onprim);

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
}

.gl-mds-sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}
</style>
